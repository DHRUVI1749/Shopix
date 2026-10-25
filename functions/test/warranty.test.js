"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    REMINDER_DAYS,
    buildMonthlyNotificationId,
    buildWarrantyNotificationId,
    getReminderLabel,
    getReminderStage
} = require("../src/warranty");

test("only the approved reminder stages are due", function () {
    assert.deepEqual(REMINDER_DAYS, [30, 7, 1]);
    assert.equal(getReminderStage("2026-10-32", "2026-10-25"), null);
    assert.equal(getReminderStage("2026-11-24", "2026-10-25"), 30);
    assert.equal(getReminderStage("2026-11-01", "2026-10-25"), 7);
    assert.equal(getReminderStage("2026-10-26", "2026-10-25"), 1);
    assert.equal(getReminderStage("2026-10-25", "2026-10-25"), null);
    assert.equal(getReminderStage("2026-10-27", "2026-10-25"), null);
    assert.equal(getReminderStage("2026-10-18", "2026-10-25"), null);
});

test("missed reminders are not backfilled", function () {
    assert.equal(getReminderStage("2026-10-20", "2026-10-25"), null);
    assert.equal(getReminderStage("2026-10-15", "2026-10-25"), null);
});

test("reminder labels are human-readable", function () {
    assert.equal(getReminderLabel(30), "in 30 days");
    assert.equal(getReminderLabel(7), "in 7 days");
    assert.equal(getReminderLabel(1), "tomorrow");
});

test("notification ids are stable and isolate stages and months", function () {
    assert.equal(
        buildMonthlyNotificationId("2026-09"),
        "monthly_report_2026-09"
    );

    assert.equal(
        buildWarrantyNotificationId(
            "warranty-1",
            "2026-10-25",
            7
        ),
        "warranty_warranty-1_2026-10-25_7"
    );

    assert.notEqual(
        buildWarrantyNotificationId("warranty-1", "2026-10-25", 7),
        buildWarrantyNotificationId("warranty-1", "2026-10-25", 1)
    );

    assert.notEqual(
        buildWarrantyNotificationId("warranty-1", "2026-10-25", 7),
        buildWarrantyNotificationId("warranty-1", "2026-10-26", 7)
    );
});
