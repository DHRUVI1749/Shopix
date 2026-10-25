// ==========================================
// SHOPIX - CURRENCY HELPERS
//
// Receipts keep the currency they were saved
// with. Totals are never converted between
// currencies, so these helpers only normalize
// and format the original values.
// ==========================================

export const OTHER_CURRENCY = "OTHER";

const CURRENCY_ALIASES = new Map([

    ["₹", "INR"],
    ["RS", "INR"],
    ["RS.", "INR"],
    ["RUPEE", "INR"],
    ["RUPEES", "INR"],

    ["$", "USD"],
    ["US$", "USD"],
    ["USD$", "USD"],
    ["DOLLAR", "USD"],
    ["DOLLARS", "USD"],

    ["€", "EUR"],
    ["£", "GBP"],
    ["¥", "JPY"],
    ["￥", "JPY"],
    ["C$", "CAD"],
    ["CA$", "CAD"],
    ["A$", "AUD"],
    ["AU$", "AUD"],
    ["S$", "SGD"],
    ["د.إ", "AED"],
    ["DH", "AED"],
    ["DHS", "AED"]
]);

const OTHER_VALUES = new Set([
    "OTHER",
    "UNKNOWN",
    "NOT SET",
    "N/A",
    "NA",
    "-"
]);

let supportedCurrencies = null;

function getSupportedCurrencies() {

    if (supportedCurrencies) {
        return supportedCurrencies;
    }

    if (
        typeof Intl.supportedValuesOf ===
        "function"
    ) {
        supportedCurrencies =
            new Set(Intl.supportedValuesOf("currency"));

        return supportedCurrencies;
    }

    supportedCurrencies = null;

    return supportedCurrencies;
}

function isSupportedCurrencyCode(code) {

    const supported =
        getSupportedCurrencies();

    if (supported) {
        return supported.has(code);
    }

    try {
        new Intl.NumberFormat("en", {
            style: "currency",
            currency: code
        }).format(0);

        return true;
    }
    catch (error) {
        return false;
    }
}

export function normalizeCurrency(value) {

    if (value === null || value === undefined) {
        return OTHER_CURRENCY;
    }

    const raw = String(value).trim();

    if (!raw) {
        return OTHER_CURRENCY;
    }

    const upper = raw.toUpperCase();

    if (OTHER_VALUES.has(upper)) {
        return OTHER_CURRENCY;
    }

    const alias =
        CURRENCY_ALIASES.get(raw) ||
        CURRENCY_ALIASES.get(upper);

    if (alias) {
        return alias;
    }

    if (
        /^[A-Z]{3}$/.test(upper) &&
        isSupportedCurrencyCode(upper)
    ) {
        return upper;
    }

    return OTHER_CURRENCY;
}

export function isKnownCurrency(currency) {
    return normalizeCurrency(currency) !== OTHER_CURRENCY;
}

export function getCurrencySymbol(currency) {

    const normalized =
        normalizeCurrency(currency);

    if (normalized === OTHER_CURRENCY) {
        return "";
    }

    try {
        const parts =
            new Intl.NumberFormat("en", {
                style: "currency",
                currency: normalized,
                currencyDisplay: "narrowSymbol"
            }).formatToParts(0);

        const symbolPart =
            parts.find(function (part) {
                return part.type === "currency";
            });

        return symbolPart ?
            symbolPart.value :
            normalized;
    }
    catch (error) {
        return normalized;
    }
}

export function getCurrencyLabel(currency) {

    const normalized =
        normalizeCurrency(currency);

    if (normalized === OTHER_CURRENCY) {
        return "Other (currency not set)";
    }

    const symbol =
        getCurrencySymbol(normalized);

    return symbol && symbol !== normalized ?
        `${normalized} (${symbol})` :
        normalized;
}

export function formatCurrency(
    amount,
    currency,
    locale = "en-IN"
) {

    const normalized =
        normalizeCurrency(currency);

    const numericAmount =
        Number(amount);

    const safeAmount =
        Number.isFinite(numericAmount) ?
            numericAmount :
            0;

    if (normalized === OTHER_CURRENCY) {

        return (
            new Intl.NumberFormat(locale, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(safeAmount) +
            " (currency not set)"
        );
    }

    try {
        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency: normalized,
            currencyDisplay: "symbol",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(safeAmount);
    }
    catch (error) {
        return (
            normalized +
            " " +
            new Intl.NumberFormat(locale, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(safeAmount)
        );
    }
}

export function compareCurrencies(a, b) {

    const first =
        normalizeCurrency(a);

    const second =
        normalizeCurrency(b);

    if (first === second) {
        return 0;
    }

    if (first === OTHER_CURRENCY) {
        return 1;
    }

    if (second === OTHER_CURRENCY) {
        return -1;
    }

    return first.localeCompare(second);
}
