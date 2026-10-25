"use strict";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function pad(value) {
    return String(value).padStart(2, "0");
}

function buildDateKey(year, month, day) {
    const yearNumber = Number(year);
    const monthNumber = Number(month);
    const dayNumber = Number(day);

    if (
        !Number.isInteger(yearNumber) ||
        !Number.isInteger(monthNumber) ||
        !Number.isInteger(dayNumber) ||
        monthNumber < 1 ||
        monthNumber > 12 ||
        dayNumber < 1 ||
        dayNumber > 31
    ) {
        return null;
    }

    const date = new Date(Date.UTC(yearNumber, monthNumber - 1, dayNumber));

    if (
        date.getUTCFullYear() !== yearNumber ||
        date.getUTCMonth() !== monthNumber - 1 ||
        date.getUTCDate() !== dayNumber
    ) {
        return null;
    }

    return `${yearNumber}-${pad(monthNumber)}-${pad(dayNumber)}`;
}

function dateToDateKey(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return null;
    }

    return buildDateKey(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate()
    );
}

function parseDateOnly(value) {
    if (value === null || value === undefined) {
        return null;
    }

    if (value instanceof Date) {
        return dateToDateKey(value);
    }

    if (
        typeof value === "object" &&
        typeof value.toDate === "function"
    ) {
        return dateToDateKey(value.toDate());
    }

    if (typeof value === "number") {
        return dateToDateKey(new Date(value));
    }

    const text = String(value).trim();

    if (!text) {
        return null;
    }

    let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

    if (match) {
        return buildDateKey(match[1], match[2], match[3]);
    }

    match = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);

    if (match) {
        let day = Number(match[1]);
        let month = Number(match[2]);

        if (month > 12 && day <= 12) {
            const swap = day;
            day = month;
            month = swap;
        }

        let year = Number(match[3]);

        if (year < 100) {
            year += 2000;
        }

        return buildDateKey(year, month, day);
    }

    const parsed = new Date(text);

    return Number.isNaN(parsed.getTime())
        ? null
        : dateToDateKey(parsed);
}

function getZonedDateParts(date = new Date(), timeZone = "Asia/Kolkata") {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });

    const parts = formatter.formatToParts(date);
    const values = {};

    parts.forEach(function (part) {
        if (part.type !== "literal") {
            values[part.type] = part.value;
        }
    });

    return {
        year: Number(values.year),
        month: Number(values.month),
        day: Number(values.day),
        dateKey: `${values.year}-${values.month}-${values.day}`
    };
}

function getTodayDateKey(date = new Date(), timeZone = "Asia/Kolkata") {
    return getZonedDateParts(date, timeZone).dateKey;
}

function getPreviousMonthPeriod(
    date = new Date(),
    timeZone = "Asia/Kolkata"
) {
    const zoned = getZonedDateParts(date, timeZone);
    const previousMonth = zoned.month === 1 ? 12 : zoned.month - 1;
    const previousYear = zoned.month === 1 ? zoned.year - 1 : zoned.year;
    const periodKey = `${previousYear}-${pad(previousMonth)}`;

    const label = new Intl.DateTimeFormat("en-IN", {
        timeZone: "UTC",
        month: "long",
        year: "numeric"
    }).format(new Date(Date.UTC(previousYear, previousMonth - 1, 1)));

    return {
        periodKey,
        year: previousYear,
        month: previousMonth,
        startDate: `${periodKey}-01`,
        endDateExclusive: `${zoned.year}-${pad(zoned.month)}-01`,
        label
    };
}

function isDateInPeriod(dateKey, period) {
    if (!dateKey || !period) {
        return false;
    }

    return (
        dateKey >= period.startDate &&
        dateKey < period.endDateExclusive
    );
}

function dateKeyToDayNumber(dateKey) {
    const parsed = parseDateOnly(dateKey);

    if (!parsed) {
        return null;
    }

    const [year, month, day] = parsed.split("-").map(Number);

    return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

function daysBetweenDateKeys(fromDateKey, toDateKey) {
    const from = dateKeyToDayNumber(fromDateKey);
    const to = dateKeyToDayNumber(toDateKey);

    if (from === null || to === null) {
        return null;
    }

    return to - from;
}

function formatDateKey(dateKey, locale = "en-IN") {
    const parsed = parseDateOnly(dateKey);

    if (!parsed) {
        return "";
    }

    const [year, month, day] = parsed.split("-").map(Number);

    return new Intl.DateTimeFormat(locale, {
        timeZone: "UTC",
        day: "numeric",
        month: "long",
        year: "numeric"
    }).format(new Date(Date.UTC(year, month - 1, day)));
}

module.exports = {
    buildDateKey,
    dateKeyToDayNumber,
    daysBetweenDateKeys,
    formatDateKey,
    getPreviousMonthPeriod,
    getTodayDateKey,
    getZonedDateParts,
    isDateInPeriod,
    parseDateOnly
};
