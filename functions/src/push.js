"use strict";

const { getMessaging } = require("firebase-admin/messaging");

const MAX_BATCH_SIZE = 500;
const TTL_SECONDS = 24 * 60 * 60;

const INVALID_FID_CODES = new Set([
    "messaging/invalid-argument",
    "messaging/invalid-registration-token",
    "messaging/registration-token-not-registered",
    "messaging/installation-id-not-registered"
]);

function chunkArray(values, size) {
    const chunks = [];

    for (let index = 0; index < values.length; index += size) {
        chunks.push(values.slice(index, index + size));
    }

    return chunks;
}

function getAppIconUrl(link) {
    try {
        return new URL("/images/logo.png", link).href;
    } catch (error) {
        return "";
    }
}

function buildPushMessage(notification, fids) {
    const iconUrl = getAppIconUrl(notification.pushLink);

    return {
        fids,
        notification: {
            title: notification.pushTitle,
            body: notification.pushBody
        },
        data: {
            notificationId: notification.id,
            type: notification.type,
            route: notification.route
        },
        webpush: {
            headers: {
                TTL: String(TTL_SECONDS),
                Urgency: "high"
            },
            notification: {
                icon: iconUrl,
                badge: iconUrl
            },
            fcmOptions: {
                link: notification.pushLink
            }
        }
    };
}

async function loadPushTargets(db, uid) {
    const snapshot = await db.collection("users")
        .doc(uid)
        .collection("pushTokens")
        .get();
    const targets = [];

    snapshot.forEach(function (documentSnapshot) {
        const data = documentSnapshot.data() || {};
        const fid = typeof data.fid === "string"
            ? data.fid.trim()
            : "";

        if (fid) {
            targets.push({
                ref: documentSnapshot.ref,
                fid
            });
        }
    });

    return targets;
}

async function removeInvalidTargets(db, targets) {
    if (!targets.length) {
        return;
    }

    for (const batchTargets of chunkArray(targets, MAX_BATCH_SIZE)) {
        const batch = db.batch();

        batchTargets.forEach(function (target) {
            batch.delete(target.ref);
        });

        await batch.commit();
    }
}

function isInvalidTarget(error) {
    return Boolean(
        error &&
        typeof error.code === "string" &&
        INVALID_FID_CODES.has(error.code)
    );
}

async function sendPushToUser(options) {
    const db = options.db;
    const uid = options.uid;
    const notification = options.notification;
    const messaging = options.messaging || getMessaging();
    const logger = options.logger;
    const targets = await loadPushTargets(db, uid);

    if (!targets.length) {
        return {
            status: "no_tokens",
            successCount: 0,
            failureCount: 0
        };
    }

    let successCount = 0;
    let failureCount = 0;
    const invalidTargets = [];

    for (const batchTargets of chunkArray(targets, MAX_BATCH_SIZE)) {
        const fids = batchTargets.map(function (target) {
            return target.fid;
        });
        const response = await messaging.sendEachForMulticast(
            buildPushMessage(notification, fids)
        );

        response.responses.forEach(function (result, index) {
            if (result.success) {
                successCount += 1;
                return;
            }

            failureCount += 1;

            if (isInvalidTarget(result.error)) {
                invalidTargets.push(batchTargets[index]);
            }
        });
    }

    await removeInvalidTargets(db, invalidTargets);

    if (
        logger &&
        typeof logger.warn === "function" &&
        failureCount > 0
    ) {
        logger.warn("Some FCM registrations could not receive a push.", {
            uid,
            notificationId: notification.id,
            successCount,
            failureCount,
            removedCount: invalidTargets.length
        });
    }

    return {
        status: successCount > 0 ? "sent" : "failed",
        successCount,
        failureCount
    };
}

module.exports = {
    MAX_BATCH_SIZE,
    buildPushMessage,
    chunkArray,
    isInvalidTarget,
    loadPushTargets,
    sendPushToUser
};
