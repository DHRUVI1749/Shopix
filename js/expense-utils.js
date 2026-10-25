// ==========================================
// SHOPIX - EXPENSE DATA HELPERS
//
// Pure functions used by the Expenses page.
// Amounts stay grouped by their original
// currency so values are never added together
// across currencies.
// ==========================================

import {
    normalizeCurrency,
    compareCurrencies
} from "./currency.js";


export function parseAmount(value) {

    if (value === null || value === undefined) {
        return 0;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }

    const cleaned =
        String(value)
            .replace(/[^0-9.-]/g, "");

    const amount =
        Number.parseFloat(cleaned);

    return Number.isFinite(amount) ? amount : 0;
}


function createLocalDate(year, month, day) {

    const date =
        new Date(year, month - 1, day);

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    return date;
}


export function parseReceiptDate(value) {

    if (!value) {
        return null;
    }

    if (value instanceof Date) {

        if (Number.isNaN(value.getTime())) {
            return null;
        }

        return createLocalDate(
            value.getFullYear(),
            value.getMonth() + 1,
            value.getDate()
        );
    }

    if (
        typeof value === "object" &&
        typeof value.toDate === "function"
    ) {
        return parseReceiptDate(value.toDate());
    }

    if (typeof value === "number") {
        return parseReceiptDate(new Date(value));
    }

    const text = String(value).trim();

    if (!text) {
        return null;
    }

    let match =
        text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

    if (match) {
        return createLocalDate(
            Number(match[1]),
            Number(match[2]),
            Number(match[3])
        );
    }

    match =
        text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);

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

        return createLocalDate(year, month, day);
    }

    const parsed = new Date(text);

    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return createLocalDate(
        parsed.getFullYear(),
        parsed.getMonth() + 1,
        parsed.getDate()
    );
}


export function filterExpenseRecords(
    records,
    filters = {}
) {

    const selectedCurrency =
        filters.currency || "ALL";

    const selectedCategory =
        filters.category || "ALL";

    const fromDate =
        parseReceiptDate(filters.from);

    const toDate =
        parseReceiptDate(filters.to);

    if (toDate) {
        toDate.setHours(23, 59, 59, 999);
    }

    return records.filter(function (record) {

        if (
            selectedCurrency !== "ALL" &&
            record.currency !== selectedCurrency
        ) {
            return false;
        }

        if (
            selectedCategory !== "ALL" &&
            record.category !== selectedCategory
        ) {
            return false;
        }

        if (fromDate) {

            if (
                !record.dateObj ||
                record.dateObj < fromDate
            ) {
                return false;
            }
        }

        if (toDate) {

            if (
                !record.dateObj ||
                record.dateObj > toDate
            ) {
                return false;
            }
        }

        return true;
    });
}


export function groupByCurrency(records) {

    const groups = new Map();

    records.forEach(function (record) {

        const currency =
            normalizeCurrency(record.currency);

        if (!groups.has(currency)) {
            groups.set(currency, {
                currency,
                total: 0,
                count: 0,
                receipts: []
            });
        }

        const group =
            groups.get(currency);

        group.total += parseAmount(record.totalAmount);
        group.count += 1;
        group.receipts.push(record);
    });

    return Array.from(groups.values())
        .sort(function (a, b) {
            return compareCurrencies(
                a.currency,
                b.currency
            );
        });
}


export function getCategoryTotals(records) {

    const totals = new Map();

    records.forEach(function (record) {

        const category =
            record.category || "Other";

        totals.set(
            category,
            (totals.get(category) || 0) +
            parseAmount(record.totalAmount)
        );
    });

    return Array.from(totals.entries())
        .map(function (entry) {
            return {
                category: entry[0],
                total: entry[1]
            };
        })
        .sort(function (a, b) {
            return (
                b.total - a.total ||
                a.category.localeCompare(b.category)
            );
        });
}


export function isInMonth(record, referenceDate) {

    if (!record.dateObj) {
        return false;
    }

    return (
        record.dateObj.getMonth() ===
        referenceDate.getMonth() &&
        record.dateObj.getFullYear() ===
        referenceDate.getFullYear()
    );
}


export function sortExpenseRecords(records) {

    return records.slice().sort(function (a, b) {

        const first =
            a.dateObj ? a.dateObj.getTime() : 0;

        const second =
            b.dateObj ? b.dateObj.getTime() : 0;

        if (first !== second) {
            return second - first;
        }

        return String(b.id || "")
            .localeCompare(String(a.id || ""));
    });
}


export function formatExpenseDate(record) {

    if (!record.dateObj) {
        return record.purchaseDate || "No date";
    }

    return record.dateObj.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}
