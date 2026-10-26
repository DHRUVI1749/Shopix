export const FOREGROUND_DEDUPE_MS = 5 * 60 * 1000;

function cleanText(value, maxLength) {
    return typeof value === "string"
        ? value.trim().slice(0, maxLength)
        : "";
}

export function normalizeForegroundPayload(payload) {
    const data = payload && payload.data ? payload.data : {};
    const notification = payload && payload.notification
        ? payload.notification
        : {};

    return {
        id: cleanText(data.notificationId, 200),
        type: cleanText(data.type, 80),
        title: cleanText(notification.title, 160) || "SHOPIX notification",
        body: cleanText(notification.body, 400) ||
            "Open SHOPIX to review your notifications.",
        route: cleanText(data.route, 500)
    };
}

export function isForegroundVisible(documentRef) {
    return Boolean(
        documentRef &&
        documentRef.visibilityState === "visible"
    );
}

export function createForegroundGate(options) {
    const settings = options || {};
    const now = typeof settings.now === "function"
        ? settings.now
        : Date.now;
    const ttlMs = Number.isFinite(settings.ttlMs)
        ? Math.max(0, settings.ttlMs)
        : FOREGROUND_DEDUPE_MS;
    const seen = new Map();

    function prune(currentTime) {
        for (const [notificationId, shownAt] of seen) {
            if (currentTime - shownAt >= ttlMs) {
                seen.delete(notificationId);
            }
        }
    }

    return {
        shouldShow: function (payload, preferences) {
            const notification = normalizeForegroundPayload(payload);
            const values = preferences || {};

            if (!notification.id || values.pushEnabled !== true) {
                return false;
            }

            if (
                notification.type === "monthly_report" &&
                values.monthlyReports === false
            ) {
                return false;
            }

            if (
                notification.type === "warranty_reminder" &&
                values.warrantyReminders === false
            ) {
                return false;
            }

            const currentTime = now();
            prune(currentTime);

            if (seen.has(notification.id)) {
                return false;
            }

            seen.set(notification.id, currentTime);
            return true;
        },
        reset: function () {
            seen.clear();
        }
    };
}
