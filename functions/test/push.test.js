"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    MAX_BATCH_SIZE,
    buildPushMessage,
    chunkArray,
    isInvalidTarget,
    sendPushToUser
} = require("../src/push");

function createFakeDatabase(tokens) {
    const deleted = [];
    const batchSizes = [];
    const documents = tokens.map(function (token, index) {
        return {
            id: `token-${index}`,
            data: {
                fid: token.fid
            }
        };
    });

    function makeRef(document) {
        return {
            id: document.id,
            delete: function () {
                deleted.push(document.id);
            }
        };
    }

    return {
        batchSizes,
        deleted,
        db: {
            collection: function () {
                return {
                    doc: function () {
                        return {
                            collection: function () {
                                return {
                                    get: async function () {
                                        return {
                                            forEach: function (callback) {
                                                documents.forEach(
                                                    function (document) {
                                                        callback({
                                                            id: document.id,
                                                            ref: makeRef(document),
                                                            data: function () {
                                                                return {
                                                                    ...document.data
                                                                };
                                                            }
                                                        });
                                                    }
                                                );
                                            }
                                        };
                                    }
                                };
                            }
                        };
                    }
                };
            },
            batch: function () {
                let size = 0;

                return {
                    delete: function (ref) {
                        ref.delete();
                        size += 1;
                    },
                    commit: async function () {
                        batchSizes.push(size);
                    }
                };
            }
        }
    };
}

test("push payload is generic and includes a safe app link", function () {
    const message = buildPushMessage(
        {
            id: "notification-1",
            type: "warranty_reminder",
            route: "warranty.html#warrantyRecords",
            pushTitle: "Warranty expires in 7 days",
            pushBody: "Open SHOPIX to review this warranty.",
            pushLink: "https://shopix.example.com/warranty.html"
        },
        ["fid-1", "fid-2"]
    );

    assert.deepEqual(message.fids, ["fid-1", "fid-2"]);
    assert.equal(message.notification.title, "Warranty expires in 7 days");
    assert.equal(
        message.data.route,
        "warranty.html#warrantyRecords"
    );
    assert.equal(
        message.webpush.fcmOptions.link,
        "https://shopix.example.com/warranty.html"
    );
    assert.equal(
        message.webpush.notification.icon,
        "https://shopix.example.com/images/logo.png"
    );
    assert.equal(
        message.webpush.notification.badge,
        "https://shopix.example.com/images/logo.png"
    );
    assert.equal(message.webpush.headers.TTL, "86400");
    assert.equal(message.webpush.headers.Urgency, "high");
    assert.equal("total" in message.data, false);
    assert.equal("amount" in message.data, false);
});

test("push targets are chunked below the FCM multicast limit", function () {
    const values = Array.from({ length: 501 }, function (_, index) {
        return index;
    });
    const chunks = chunkArray(values, MAX_BATCH_SIZE);

    assert.equal(MAX_BATCH_SIZE, 500);
    assert.equal(chunks.length, 2);
    assert.equal(chunks[0].length, 500);
    assert.equal(chunks[1].length, 1);
});

test("only registration-not-found errors remove tokens", function () {
    assert.equal(
        isInvalidTarget({
            code: "messaging/registration-token-not-registered"
        }),
        true
    );
    assert.equal(
        isInvalidTarget({
            code: "messaging/installation-id-not-registered"
        }),
        true
    );
    assert.equal(
        isInvalidTarget({ code: "messaging/internal-error" }),
        false
    );
    assert.equal(isInvalidTarget(null), false);
});

test("push sends to FIDs and removes invalid registrations", async function () {
    const fake = createFakeDatabase([
        { fid: "fid-valid" },
        { fid: "fid-invalid" }
    ]);
    const calls = [];
    const messaging = {
        sendEachForMulticast: async function (message) {
            calls.push(message);
            return {
                responses: [
                    { success: true },
                    {
                        success: false,
                        error: {
                            code: "messaging/installation-id-not-registered"
                        }
                    }
                ]
            };
        }
    };

    const result = await sendPushToUser({
        db: fake.db,
        uid: "user-1",
        notification: {
            id: "notification-1",
            type: "monthly_report",
            route: "reports.html",
            pushTitle: "Report ready",
            pushBody: "Open SHOPIX to review your report.",
            pushLink: "https://shopix.example.com/reports.html"
        },
        messaging,
        logger: null
    });

    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].fids, ["fid-valid", "fid-invalid"]);
    assert.equal(result.status, "sent");
    assert.equal(result.successCount, 1);
    assert.equal(result.failureCount, 1);
    assert.deepEqual(fake.deleted, ["token-1"]);
});

test("invalid registration cleanup stays within batch limits", async function () {
    const fake = createFakeDatabase(
        Array.from({ length: 501 }, function (_, index) {
            return { fid: `fid-invalid-${index}` };
        })
    );
    const messaging = {
        sendEachForMulticast: async function (message) {
            return {
                responses: message.fids.map(function () {
                    return {
                        success: false,
                        error: {
                            code: "messaging/installation-id-not-registered"
                        }
                    };
                })
            };
        }
    };

    const result = await sendPushToUser({
        db: fake.db,
        uid: "user-1",
        notification: {
            id: "notification-1",
            type: "monthly_report",
            route: "reports.html",
            pushTitle: "Report ready",
            pushBody: "Open SHOPIX to review your report.",
            pushLink: "https://shopix.example.com/reports.html"
        },
        messaging,
        logger: null
    });

    assert.equal(result.status, "failed");
    assert.equal(fake.deleted.length, 501);
    assert.deepEqual(fake.batchSizes, [500, 1]);
});

test("push reports no tokens without calling FCM", async function () {
    const fake = createFakeDatabase([]);
    let called = false;

    const result = await sendPushToUser({
        db: fake.db,
        uid: "user-1",
        notification: {
            id: "notification-1",
            type: "monthly_report",
            route: "reports.html",
            pushTitle: "Report ready",
            pushBody: "Open SHOPIX to review your report.",
            pushLink: "https://shopix.example.com/reports.html"
        },
        messaging: {
            sendEachForMulticast: async function () {
                called = true;
            }
        }
    });

    assert.equal(called, false);
    assert.equal(result.status, "no_tokens");
});
