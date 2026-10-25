"use strict";

const { FieldValue } = require("firebase-admin/firestore");

const {
    formatDateKey,
    getPreviousMonthPeriod,
    getTodayDateKey,
    parseDateOnly
} = require("./dates");

const {
    buildMonthlyNotificationId,
    buildWarrantyNotificationId,
    getReminderLabel,
    getReminderStage
} = require("./warranty");

const { sendPushToUser } = require("./push");
const { buildAppUrl } = require("./url");

const AUTH_PAGE_SIZE = 1000;

const DEFAULT_PREFERENCES = Object.freeze({
    pushEnabled: false,
    monthlyReports: true,
    warrantyReminders: true
});

function createMonthlyStats(period) {
    return {
        period: period.periodKey,
        users: 0,
        created: 0,
        alreadyExists: 0,
        skipped: 0,
        failed: 0,
        pushSent: 0,
        pushSkipped: 0,
        pushFailed: 0
    };
}

function createWarrantyStats(todayDateKey) {
    return {
        date: todayDateKey,
        users: 0,
        due: 0,
        created: 0,
        alreadyExists: 0,
        skipped: 0,
        failed: 0,
        pushSent: 0,
        pushSkipped: 0,
        pushFailed: 0
    };
}

function logInfo(logger, message, data) {
    if (logger && typeof logger.info === "function") {
        logger.info(message, data || undefined);
    }
}

function logWarning(logger, message, data) {
    if (logger && typeof logger.warn === "function") {
        logger.warn(message, data || undefined);
    }
}

function logError(logger, message, error, data) {
    if (logger && typeof logger.error === "function") {
        logger.error(message, {
            ...(data || {}),
            error: error && (error.stack || error.message || String(error))
        });
    }
}

async function* listAllUsers(auth) {
    let pageToken = undefined;

    do {
        const result = await auth.listUsers(AUTH_PAGE_SIZE, pageToken);
        const users = Array.isArray(result.users) ? result.users : [];

        for (const user of users) {
            yield user;
        }

        pageToken = result.pageToken || undefined;
    } while (pageToken);
}

function normalizePreferences(data) {
    const values = data || {};

    return {
        pushEnabled: values.pushEnabled === true,
        monthlyReports: values.monthlyReports !== false,
        warrantyReminders: values.warrantyReminders !== false
    };
}

async function getNotificationPreferences(db, uid) {
    const snapshot = await db.collection("users")
        .doc(uid)
        .collection("notificationPreferences")
        .doc("settings")
        .get();

    return normalizePreferences(
        snapshot.exists ? snapshot.data() : DEFAULT_PREFERENCES
    );
}

async function loadDocuments(collectionRef) {
    const snapshot = await collectionRef.get();
    const documents = [];

    snapshot.forEach(function (documentSnapshot) {
        documents.push({
            id: documentSnapshot.id,
            data: documentSnapshot.data() || {}
        });
    });

    return documents;
}

async function createNotificationOnce(db, ref, data) {
    return db.runTransaction(async function (transaction) {
        const snapshot = await transaction.get(ref);

        if (snapshot.exists) {
            return {
                created: false
            };
        }

        transaction.set(ref, data);

        return {
            created: true
        };
    });
}

function buildMonthlyNotification(options) {
    const period = options.period;
    const route = `reports.html?monthly=${period.periodKey}#monthlyReport`;
    const title = `Your ${period.label} expense report is ready`;

    return {
        id: buildMonthlyNotificationId(period.periodKey),
        data: {
            type: "monthly_report",
            severity: "info",
            title,
            message: "Review last month's report and this month's spending so far.",
            route,
            pushTitle: title,
            pushBody: "Open SHOPIX to review last month and this month so far.",
            pushLink: buildAppUrl(options.appBaseUrl, route),
            periodKey: period.periodKey,
            periodLabel: period.label,
            createdAt: FieldValue.serverTimestamp(),
            readAt: null,
            pushStatus: "pending"
        }
    };
}

function buildWarrantyNotification(options) {
    const warranty = options.warranty;
    const stage = options.stage;
    const productName = String(
        warranty.productName || "Warranty item"
    ).trim() || "Warranty item";
    const expiryDateKey = options.expiryDateKey;
    const route = "warranty.html#warrantyRecords";
    const title = `Warranty expires ${getReminderLabel(stage)}`;

    return {
        id: buildWarrantyNotificationId(
            warranty.id,
            expiryDateKey,
            stage
        ),
        data: {
            type: "warranty_reminder",
            severity: "warning",
            title,
            message: `${productName} warranty expires on ${formatDateKey(expiryDateKey)}.`,
            route,
            pushTitle: title,
            pushBody: "Open SHOPIX to review this warranty.",
            pushLink: buildAppUrl(options.appBaseUrl, route),
            warrantyId: warranty.id,
            productName,
            expiryDate: expiryDateKey,
            stage,
            createdAt: FieldValue.serverTimestamp(),
            readAt: null,
            pushStatus: "pending"
        }
    };
}

async function recordPushResult(ref, result) {
    await ref.set(
        {
            pushStatus: result.status,
            pushSuccessCount: result.successCount || 0,
            pushFailureCount: result.failureCount || 0,
            pushUpdatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
    );
}

async function deliverPush(options) {
    const notification = options.notification;

    if (!options.preferences.pushEnabled) {
        await recordPushResult(options.ref, {
            status: "disabled",
            successCount: 0,
            failureCount: 0
        });

        return "disabled";
    }

    try {
        const result = await options.sendPush({
            db: options.db,
            uid: options.uid,
            notification: {
                ...notification.data,
                id: notification.id
            },
            messaging: options.messaging,
            logger: options.logger
        });

        await recordPushResult(options.ref, result);

        if (result.status === "sent") {
            return "sent";
        }

        if (result.status === "no_tokens") {
            return "skipped";
        }

        return "failed";
    } catch (error) {
        logError(
            options.logger,
            "FCM push delivery failed.",
            error,
            {
                uid: options.uid,
                notificationId: notification.id
            }
        );

        await recordPushResult(options.ref, {
            status: "failed",
            successCount: 0,
            failureCount: 0
        });

        return "failed";
    }
}

async function sendMonthlyReports(options) {
    const db = options.db;
    const auth = options.auth;
    const now = options.now || new Date();
    const timeZone = options.timeZone || "Asia/Kolkata";
    const appBaseUrl = options.appBaseUrl;
    const logger = options.logger;
    const sendPush = options.sendPush || sendPushToUser;
    const period = getPreviousMonthPeriod(now, timeZone);
    const stats = createMonthlyStats(period);

    logInfo(logger, "Starting monthly SHOPIX report notifications.", {
        periodKey: period.periodKey,
        timeZone
    });

    for await (const user of listAllUsers(auth)) {
        stats.users += 1;

        try {
            const preferences = await getNotificationPreferences(
                db,
                user.uid
            );

            if (!preferences.monthlyReports) {
                stats.skipped += 1;
                continue;
            }

            const notification = buildMonthlyNotification({
                period,
                appBaseUrl
            });

            const notificationRef = db.collection("users")
                .doc(user.uid)
                .collection("notifications")
                .doc(notification.id);

            const claim = await createNotificationOnce(
                db,
                notificationRef,
                notification.data
            );

            if (!claim.created) {
                stats.alreadyExists += 1;
                continue;
            }

            stats.created += 1;

            const pushStatus = await deliverPush({
                db,
                uid: user.uid,
                notification,
                ref: notificationRef,
                preferences,
                sendPush,
                messaging: options.messaging,
                logger
            });

            if (pushStatus === "sent") {
                stats.pushSent += 1;
            } else if (pushStatus === "failed") {
                stats.pushFailed += 1;
            } else {
                stats.pushSkipped += 1;
            }
        } catch (error) {
            stats.failed += 1;
            logError(
                logger,
                "Monthly report notification failed.",
                error,
                { uid: user.uid, periodKey: period.periodKey }
            );
        }
    }

    logInfo(logger, "Monthly SHOPIX report notifications finished.", stats);

    if (stats.failed > 0) {
        const error = new Error(
            `${stats.failed} monthly report notification failure(s).`
        );
        error.stats = stats;
        throw error;
    }

    return stats;
}

async function sendWarrantyReminders(options) {
    const db = options.db;
    const auth = options.auth;
    const now = options.now || new Date();
    const timeZone = options.timeZone || "Asia/Kolkata";
    const appBaseUrl = options.appBaseUrl;
    const logger = options.logger;
    const sendPush = options.sendPush || sendPushToUser;
    const todayDateKey = getTodayDateKey(now, timeZone);
    const stats = createWarrantyStats(todayDateKey);

    logInfo(logger, "Starting SHOPIX warranty reminders.", {
        todayDateKey,
        timeZone
    });

    for await (const user of listAllUsers(auth)) {
        stats.users += 1;

        try {
            const preferences = await getNotificationPreferences(
                db,
                user.uid
            );

            if (!preferences.warrantyReminders) {
                stats.skipped += 1;
                continue;
            }

            const warranties = await loadDocuments(
                db.collection("users")
                    .doc(user.uid)
                    .collection("warranties")
            );

            for (const warranty of warranties) {
                const expiryDateKey = parseDateOnly(
                    warranty.data.warrantyExpiryDate
                );

                if (!expiryDateKey) {
                    continue;
                }

                const stage = getReminderStage(
                    expiryDateKey,
                    todayDateKey
                );

                if (stage === null) {
                    continue;
                }

                stats.due += 1;

                const notification = buildWarrantyNotification({
                    warranty: {
                        ...warranty.data,
                        id: warranty.id
                    },
                    expiryDateKey,
                    stage,
                    appBaseUrl
                });

                const notificationRef = db.collection("users")
                    .doc(user.uid)
                    .collection("notifications")
                    .doc(notification.id);

                const claim = await createNotificationOnce(
                    db,
                    notificationRef,
                    notification.data
                );

                if (!claim.created) {
                    stats.alreadyExists += 1;
                    continue;
                }

                stats.created += 1;

                const pushStatus = await deliverPush({
                    db,
                    uid: user.uid,
                    notification,
                    ref: notificationRef,
                    preferences,
                    sendPush,
                    messaging: options.messaging,
                    logger
                });

                if (pushStatus === "sent") {
                    stats.pushSent += 1;
                } else if (pushStatus === "failed") {
                    stats.pushFailed += 1;
                } else {
                    stats.pushSkipped += 1;
                }
            }
        } catch (error) {
            stats.failed += 1;
            logError(
                logger,
                "Warranty reminder preparation failed.",
                error,
                { uid: user.uid }
            );
        }
    }

    logInfo(logger, "SHOPIX warranty reminders finished.", stats);

    if (stats.failed > 0) {
        const error = new Error(
            `${stats.failed} warranty reminder failure(s).`
        );
        error.stats = stats;
        throw error;
    }

    return stats;
}

module.exports = {
    DEFAULT_PREFERENCES,
    buildMonthlyNotification,
    buildWarrantyNotification,
    createNotificationOnce,
    getNotificationPreferences,
    listAllUsers,
    normalizePreferences,
    sendMonthlyReports,
    sendWarrantyReminders
};
