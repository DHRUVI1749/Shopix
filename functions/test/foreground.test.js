"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const modulePath = path.join(
    __dirname,
    "..",
    "..",
    "js",
    "notification-foreground.mjs"
);
const moduleUrl = pathToFileURL(modulePath).href;

function createPayload(overrides) {
    return {
        data: {
            notificationId: "notification-1",
            type: "monthly_report",
            route: "reports.html?monthly=2026-09#monthlyReport",
            ...(overrides && overrides.data)
        },
        notification: {
            title: "Report ready",
            body: "Open SHOPIX to review your report.",
            ...(overrides && overrides.notification)
        }
    };
}

function createPreferences(overrides) {
    return {
        pushEnabled: true,
        monthlyReports: true,
        warrantyReminders: true,
        ...(overrides || {})
    };
}

test("foreground gate suppresses duplicate messages within the TTL", async function () {
    const { createForegroundGate } = await import(moduleUrl);
    let now = 1000;
    const gate = createForegroundGate({
        ttlMs: 5000,
        now: function () {
            return now;
        }
    });
    const payload = createPayload();

    assert.equal(gate.shouldShow(payload, createPreferences()), true);
    assert.equal(gate.shouldShow(payload, createPreferences()), false);

    now += 5000;
    assert.equal(gate.shouldShow(payload, createPreferences()), true);
});

test("foreground gate respects push and category preferences", async function () {
    const { createForegroundGate } = await import(moduleUrl);
    const gate = createForegroundGate();

    assert.equal(
        gate.shouldShow(createPayload(), createPreferences({
            pushEnabled: false
        })),
        false
    );
    assert.equal(
        gate.shouldShow(createPayload(), createPreferences({
            monthlyReports: false
        })),
        false
    );
    assert.equal(
        gate.shouldShow(
            createPayload({
                data: { type: "warranty_reminder" }
            }),
            createPreferences({ warrantyReminders: false })
        ),
        false
    );
    assert.equal(
        gate.shouldShow(
            createPayload({
                data: { notificationId: "" }
            }),
            createPreferences()
        ),
        false
    );

    assert.equal(gate.shouldShow(createPayload(), createPreferences()), true);
    assert.equal(gate.shouldShow(createPayload(), createPreferences()), false);

    gate.reset();
    assert.equal(gate.shouldShow(createPayload(), createPreferences()), true);
});

test("foreground messages are handled whenever the app is visible", async function () {
    const { isForegroundVisible } = await import(moduleUrl);

    assert.equal(
        isForegroundVisible({
            visibilityState: "visible",
            hasFocus: function () {
                return true;
            }
        }),
        true
    );
    assert.equal(
        isForegroundVisible({
            visibilityState: "visible",
            hasFocus: function () {
                return false;
            }
        }),
        true
    );
    assert.equal(isForegroundVisible({ visibilityState: "hidden" }), false);
    assert.equal(isForegroundVisible({ visibilityState: "visible" }), true);
    assert.equal(isForegroundVisible(null), false);
});

test("foreground payload normalization is bounded and has safe fallbacks", async function () {
    const { normalizeForegroundPayload } = await import(moduleUrl);
    const notification = normalizeForegroundPayload({
        data: {
            notificationId: " notification-1 ",
            type: " warranty_reminder ",
            route: " warranty.html#warrantyRecords "
        },
        notification: {
            title: "  Warranty expiring  ",
            body: ""
        }
    });

    assert.equal(notification.id, "notification-1");
    assert.equal(notification.type, "warranty_reminder");
    assert.equal(notification.route, "warranty.html#warrantyRecords");
    assert.equal(notification.title, "Warranty expiring");
    assert.equal(
        notification.body,
        "Open SHOPIX to review your notifications."
    );
    assert.equal(
        normalizeForegroundPayload({
            notification: { title: "x".repeat(200) }
        }).title.length,
        160
    );
});
