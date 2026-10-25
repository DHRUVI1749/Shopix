"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    buildDateKey,
    daysBetweenDateKeys,
    formatDateKey,
    getPreviousMonthPeriod,
    getTodayDateKey,
    isDateInPeriod,
    parseDateOnly
} = require("../src/dates");

test("previous month follows Asia/Kolkata at the January boundary", function () {
    const period = getPreviousMonthPeriod(
        new Date("2026-01-01T03:30:00.000Z"),
        "Asia/Kolkata"
    );

    assert.equal(period.periodKey, "2025-12");
    assert.equal(period.startDate, "2025-12-01");
    assert.equal(period.endDateExclusive, "2026-01-01");
    assert.equal(period.label, "December 2025");
});

test("previous month remains correct just before IST midnight", function () {
    const period = getPreviousMonthPeriod(
        new Date("2026-02-28T18:20:00.000Z"),
        "Asia/Kolkata"
    );

    assert.equal(period.periodKey, "2026-01");
    assert.equal(period.startDate, "2026-01-01");
    assert.equal(period.endDateExclusive, "2026-02-01");
});

test("period filtering is inclusive at the start and exclusive at the end", function () {
    const period = getPreviousMonthPeriod(
        new Date("2026-10-01T03:30:00.000Z"),
        "Asia/Kolkata"
    );

    assert.equal(isDateInPeriod("2026-09-01", period), true);
    assert.equal(isDateInPeriod("2026-09-30", period), true);
    assert.equal(isDateInPeriod("2026-08-31", period), false);
    assert.equal(isDateInPeriod("2026-10-01", period), false);
});

test("date-only parsing handles the formats used by receipts", function () {
    assert.equal(parseDateOnly("2026-10-25"), "2026-10-25");
    assert.equal(parseDateOnly("25-10-2026"), "2026-10-25");
    assert.equal(parseDateOnly("25/10/2026"), "2026-10-25");
    assert.equal(parseDateOnly("2026-2-3"), "2026-02-03");
    assert.equal(parseDateOnly("2026-02-30"), null);
    assert.equal(parseDateOnly(""), null);
});

test("date-only parsing accepts Firestore-style timestamps", function () {
    const value = {
        toDate: function () {
            return new Date("2026-10-25T12:00:00.000Z");
        }
    };

    assert.equal(parseDateOnly(value), "2026-10-25");
});

test("today date key uses the configured timezone", function () {
    const now = new Date("2026-10-24T20:00:00.000Z");

    assert.equal(getTodayDateKey(now, "UTC"), "2026-10-24");
    assert.equal(getTodayDateKey(now, "Asia/Kolkata"), "2026-10-25");
});

test("date arithmetic does not use local timezone or DST", function () {
    assert.equal(
        daysBetweenDateKeys("2026-03-08", "2026-03-11"),
        3
    );
    assert.equal(
        daysBetweenDateKeys("2026-12-31", "2027-01-01"),
        1
    );
});

test("date formatting and validation are stable", function () {
    assert.equal(buildDateKey(2024, 2, 29), "2024-02-29");
    assert.equal(buildDateKey(2026, 2, 29), null);
    assert.equal(formatDateKey("2026-10-05"), "5 October 2026");
});
