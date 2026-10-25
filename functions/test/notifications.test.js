"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    sendMonthlyReports,
    sendWarrantyReminders
} = require("../src/notifications");

function createFakeDatabase(seed) {
    const documents = new Map();

    Object.entries(seed || {}).forEach(function ([uid, collections]) {
        Object.entries(collections || {}).forEach(
            function ([collectionName, values]) {
                if (Array.isArray(values)) {
                    values.forEach(function (entry) {
                        documents.set(
                            `${uid}/${collectionName}/${entry.id}`,
                            { ...entry.data }
                        );
                    });
                    return;
                }

                Object.entries(values || {}).forEach(
                    function ([id, data]) {
                        documents.set(
                            `${uid}/${collectionName}/${id}`,
                            { ...data }
                        );
                    }
                );
            }
        );
    });

    function makeDocRef(uid, collectionName, id) {
        const path = `${uid}/${collectionName}/${id}`;

        return {
            path,
            uid,
            collectionName,
            id,
            get: async function () {
                const data = documents.get(path);

                return {
                    exists: Boolean(data),
                    data: function () {
                        return data ? { ...data } : undefined;
                    }
                };
            },
            set: async function (value, options) {
                const previous = documents.get(path) || {};
                documents.set(
                    path,
                    options && options.merge
                        ? { ...previous, ...value }
                        : { ...value }
                );
            }
        };
    }

    function makeCollectionRef(uid, collectionName) {
        return {
            get: async function () {
                const entries = Array.from(documents.entries()).filter(
                    function ([path]) {
                        return path.startsWith(
                            `${uid}/${collectionName}/`
                        );
                    }
                );

                return {
                    forEach: function (callback) {
                        entries.forEach(function ([path, data]) {
                            const id = path.split("/").pop();

                            callback({
                                id,
                                ref: makeDocRef(uid, collectionName, id),
                                data: function () {
                                    return { ...data };
                                }
                            });
                        });
                    }
                };
            },
            doc: function (id) {
                return makeDocRef(uid, collectionName, id);
            }
        };
    }

    const db = {
        collection: function (name) {
            assert.equal(name, "users");

            return {
                doc: function (uid) {
                    return {
                        collection: function (collectionName) {
                            return makeCollectionRef(uid, collectionName);
                        }
                    };
                }
            };
        },
        runTransaction: async function (callback) {
            return callback({
                get: async function (ref) {
                    const data = documents.get(ref.path);

                    return {
                        exists: Boolean(data),
                        data: function () {
                            return data ? { ...data } : undefined;
                        }
                    };
                },
                set: function (ref, value, options) {
                    const previous = documents.get(ref.path) || {};
                    documents.set(
                        ref.path,
                        options && options.merge
                            ? { ...previous, ...value }
                            : { ...value }
                    );
                }
            });
        }
    };

    return {
        db,
        documents,
        get: function (uid, collectionName, id) {
            return documents.get(`${uid}/${collectionName}/${id}`);
        }
    };
}

function createAuth(users) {
    return {
        listUsers: async function () {
            return {
                users,
                pageToken: undefined
            };
        }
    };
}

function createUser(overrides) {
    return {
        uid: "user-1",
        email: "user@example.com",
        emailVerified: true,
        displayName: "Test User",
        ...overrides
    };
}

test("monthly notifications are created once per user and period", async function () {
    const fake = createFakeDatabase({
        "user-1": {
            notificationPreferences: {
                settings: {
                    pushEnabled: true,
                    monthlyReports: true
                }
            }
        }
    });
    const pushes = [];
    const options = {
        db: fake.db,
        auth: createAuth([createUser()]),
        sendPush: async function (request) {
            pushes.push(request);
            return {
                status: "sent",
                successCount: 1,
                failureCount: 0
            };
        },
        now: new Date("2026-10-01T03:30:00.000Z"),
        timeZone: "Asia/Kolkata",
        appBaseUrl: "https://shopix.example.com"
    };

    const first = await sendMonthlyReports(options);
    const second = await sendMonthlyReports(options);
    const notification = fake.get(
        "user-1",
        "notifications",
        "monthly_report_2026-09"
    );

    assert.equal(first.created, 1);
    assert.equal(first.pushSent, 1);
    assert.equal(second.created, 0);
    assert.equal(second.alreadyExists, 1);
    assert.equal(pushes.length, 1);
    assert.equal(notification.type, "monthly_report");
    assert.match(notification.title, /September 2026/);
    assert.equal(
        notification.route,
        "reports.html?monthly=2026-09#monthlyReport"
    );
    assert.equal(notification.readAt, null);
    assert.equal(notification.pushStatus, "sent");
    assert.equal(notification.pushSuccessCount, 1);
    assert.equal(
        pushes[0].notification.id,
        "monthly_report_2026-09"
    );
    assert.match(
        pushes[0].notification.pushLink,
        /^https:\/\/shopix\.example\.com\/reports\.html/
    );
});

test("monthly in-app notifications exist when push is disabled", async function () {
    const fake = createFakeDatabase({});

    const stats = await sendMonthlyReports({
        db: fake.db,
        auth: createAuth([createUser()]),
        sendPush: async function () {
            throw new Error("push should not be attempted");
        },
        now: new Date("2026-10-01T03:30:00.000Z"),
        timeZone: "Asia/Kolkata",
        appBaseUrl: "https://shopix.example.com"
    });

    const notification = fake.get(
        "user-1",
        "notifications",
        "monthly_report_2026-09"
    );

    assert.equal(stats.created, 1);
    assert.equal(stats.pushSkipped, 1);
    assert.equal(notification.pushStatus, "disabled");
});

test("unverified users receive monthly notices and category opt-outs are skipped", async function () {
    const fake = createFakeDatabase({
        "user-2": {
            notificationPreferences: {
                settings: {
                    pushEnabled: true,
                    monthlyReports: false
                }
            }
        }
    });
    let pushCount = 0;

    const stats = await sendMonthlyReports({
        db: fake.db,
        auth: createAuth([
            createUser({ uid: "user-1", emailVerified: false }),
            createUser({ uid: "user-2", emailVerified: true })
        ]),
        sendPush: async function () {
            pushCount += 1;
            return {
                status: "sent",
                successCount: 1,
                failureCount: 0
            };
        },
        now: new Date("2026-10-01T03:30:00.000Z"),
        timeZone: "Asia/Kolkata",
        appBaseUrl: "https://shopix.example.com"
    });

    assert.equal(stats.users, 2);
    assert.equal(stats.created, 1);
    assert.equal(stats.skipped, 1);
    assert.equal(pushCount, 0);
    assert.ok(
        fake.get("user-1", "notifications", "monthly_report_2026-09")
    );
    assert.equal(
        fake.get("user-2", "notifications", "monthly_report_2026-09"),
        undefined
    );
});

test("warranty reminders use 30, 7, and 1 day stages without duplicates", async function () {
    const fake = createFakeDatabase({
        "user-1": {
            notificationPreferences: {
                settings: {
                    pushEnabled: true,
                    warrantyReminders: true
                }
            },
            warranties: [
                {
                    id: "due-30",
                    data: {
                        productName: "Laptop",
                        warrantyExpiryDate: "2026-11-24"
                    }
                },
                {
                    id: "due-7",
                    data: {
                        productName: "Headphones",
                        warrantyExpiryDate: "2026-11-01"
                    }
                },
                {
                    id: "due-1",
                    data: {
                        productName: "Phone",
                        warrantyExpiryDate: "2026-10-26"
                    }
                },
                {
                    id: "today",
                    data: {
                        productName: "Camera",
                        warrantyExpiryDate: "2026-10-25"
                    }
                },
                {
                    id: "missed",
                    data: {
                        productName: "Monitor",
                        warrantyExpiryDate: "2026-10-20"
                    }
                },
                {
                    id: "not-due",
                    data: {
                        productName: "Tablet",
                        warrantyExpiryDate: "2026-10-27"
                    }
                }
            ]
        }
    });
    const pushes = [];
    const options = {
        db: fake.db,
        auth: createAuth([createUser()]),
        sendPush: async function (request) {
            pushes.push(request);
            return {
                status: "sent",
                successCount: 1,
                failureCount: 0
            };
        },
        now: new Date("2026-10-25T03:30:00.000Z"),
        timeZone: "Asia/Kolkata",
        appBaseUrl: "https://shopix.example.com"
    };

    const first = await sendWarrantyReminders(options);
    const second = await sendWarrantyReminders(options);
    const dueSeven = fake.get(
        "user-1",
        "notifications",
        "warranty_due-7_2026-11-01_7"
    );

    assert.equal(first.due, 3);
    assert.equal(first.created, 3);
    assert.equal(first.pushSent, 3);
    assert.equal(second.due, 3);
    assert.equal(second.alreadyExists, 3);
    assert.equal(pushes.length, 3);
    assert.equal(dueSeven.stage, 7);
    assert.equal(dueSeven.productName, "Headphones");
    assert.equal(dueSeven.route, "warranty.html#warrantyRecords");
    assert.match(dueSeven.message, /1 November 2026/);
    assert.equal(
        fake.get("user-1", "notifications", "warranty_today_2026-10-25_0"),
        undefined
    );
});

test("warranty category opt-out skips reminders for that user", async function () {
    const fake = createFakeDatabase({
        "user-1": {
            notificationPreferences: {
                settings: {
                    pushEnabled: true,
                    warrantyReminders: false
                }
            },
            warranties: [
                {
                    id: "w1",
                    data: {
                        productName: "Laptop",
                        warrantyExpiryDate: "2026-11-01"
                    }
                }
            ]
        }
    });
    let pushCount = 0;

    const stats = await sendWarrantyReminders({
        db: fake.db,
        auth: createAuth([createUser()]),
        sendPush: async function () {
            pushCount += 1;
            return {
                status: "sent",
                successCount: 1,
                failureCount: 0
            };
        },
        now: new Date("2026-10-25T03:30:00.000Z"),
        timeZone: "Asia/Kolkata",
        appBaseUrl: "https://shopix.example.com"
    });

    assert.equal(stats.skipped, 1);
    assert.equal(stats.created, 0);
    assert.equal(pushCount, 0);
    assert.equal(
        fake.get("user-1", "notifications", "warranty_w1_2026-11-01_7"),
        undefined
    );
});

test("warranty reminders remain in-app when push delivery fails", async function () {
    const fake = createFakeDatabase({
        "user-1": {
            notificationPreferences: {
                settings: {
                    pushEnabled: true,
                    warrantyReminders: true
                }
            },
            warranties: [
                {
                    id: "w1",
                    data: {
                        productName: "Laptop",
                        warrantyExpiryDate: "2026-11-01"
                    }
                }
            ]
        }
    });

    const stats = await sendWarrantyReminders({
        db: fake.db,
        auth: createAuth([createUser()]),
        sendPush: async function () {
            throw new Error("FCM unavailable");
        },
        now: new Date("2026-10-25T03:30:00.000Z"),
        timeZone: "Asia/Kolkata",
        appBaseUrl: "https://shopix.example.com"
    });
    const notification = fake.get(
        "user-1",
        "notifications",
        "warranty_w1_2026-11-01_7"
    );

    assert.equal(stats.created, 1);
    assert.equal(stats.pushFailed, 1);
    assert.equal(notification.pushStatus, "failed");
});

test("changing a warranty expiry creates a new reminder", async function () {
    const fake = createFakeDatabase({
        "user-1": {
            notificationPreferences: {
                settings: {
                    pushEnabled: false
                }
            },
            warranties: [
                {
                    id: "w1",
                    data: {
                        productName: "Laptop",
                        warrantyExpiryDate: "2026-10-26"
                    }
                }
            ]
        }
    });
    const options = {
        db: fake.db,
        auth: createAuth([createUser()]),
        sendPush: async function () {
            throw new Error("push should not be attempted");
        },
        now: new Date("2026-10-25T03:30:00.000Z"),
        timeZone: "Asia/Kolkata",
        appBaseUrl: "https://shopix.example.com"
    };

    await sendWarrantyReminders(options);
    fake.documents.set(
        "user-1/warranties/w1",
        {
            productName: "Laptop",
            warrantyExpiryDate: "2026-11-01"
        }
    );
    await sendWarrantyReminders(options);

    assert.ok(
        fake.get("user-1", "notifications", "warranty_w1_2026-10-26_1")
    );
    assert.ok(
        fake.get("user-1", "notifications", "warranty_w1_2026-11-01_7")
    );
    assert.equal(
        Array.from(fake.documents.keys()).filter(function (path) {
            return path.startsWith("user-1/notifications/");
        }).length,
        2
    );
});
