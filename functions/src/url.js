"use strict";

const FALLBACK_APP_URL = "https://shopix-f1fee.web.app";

function buildAppUrl(baseUrl, route) {
    const rawBase = String(baseUrl || "").trim() || FALLBACK_APP_URL;
    const safeBase = /^https?:\/\//i.test(rawBase)
        ? rawBase
        : `https://${rawBase}`;

    try {
        const normalizedBase = safeBase.endsWith("/")
            ? safeBase
            : `${safeBase}/`;

        return new URL(
            String(route || "").replace(/^\/+/, ""),
            normalizedBase
        ).toString();
    } catch (error) {
        return FALLBACK_APP_URL + "/";
    }
}

module.exports = {
    buildAppUrl
};
