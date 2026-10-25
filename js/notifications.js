import { app, db } from "./firebase.js";

import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    writeBatch
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
    getMessaging,
    isSupported,
    onRegistered,
    onUnregistered,
    register,
    unregister
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging.js";


// ==========================================
// CONFIGURATION
// ==========================================

// Paste the Web Push certificate public key from
// Firebase Console > Project settings > Cloud
// Messaging > Web Push certificates.
export const FCM_VAPID_KEY = "";

const PUSH_REGISTRATION_TIMEOUT = 20000;
const NOTIFICATION_LIMIT = 50;
const USER_AGENT_LIMIT = 400;

export const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
    pushEnabled: false,
    monthlyReports: true,
    warrantyReminders: true
});

let messagingInstance = null;
let registeredUnsubscribe = null;
let unregisteredUnsubscribe = null;
let pushUid = null;
let resolveRegistration = null;
let rejectRegistration = null;


// ==========================================
// HELPERS
// ==========================================

export function isPushConfigured() {
    return Boolean(FCM_VAPID_KEY.trim());
}

export function createPushError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

export function normalizeNotificationPreferences(value) {
    const data = value || {};

    return {
        pushEnabled: data.pushEnabled === true,
        monthlyReports: data.monthlyReports !== false,
        warrantyReminders: data.warrantyReminders !== false
    };
}

function preferencesRef(uid) {
    return doc(
        db,
        "users",
        uid,
        "notificationPreferences",
        "settings"
    );
}

function notificationsRef(uid) {
    return collection(db, "users", uid, "notifications");
}

async function hashFid(fid) {
    if (!window.crypto?.subtle) {
        throw createPushError(
            "push/unsupported",
            "This browser cannot securely register for push notifications."
        );
    }

    const bytes = new TextEncoder().encode(fid);
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);

    return Array.from(new Uint8Array(digest))
        .map(function (byte) {
            return byte.toString(16).padStart(2, "0");
        })
        .join("");
}

async function storePushRegistration(uid, fid) {
    if (!uid || !fid) {
        return;
    }

    const tokenId = await hashFid(fid);
    const tokenRef = doc(db, "users", uid, "pushTokens", tokenId);
    const existing = await getDoc(tokenRef);
    const now = serverTimestamp();

    await setDoc(
        tokenRef,
        {
            fid,
            type: "web",
            userAgent: navigator.userAgent.slice(0, USER_AGENT_LIMIT),
            createdAt: existing.exists()
                ? existing.data().createdAt
                : now,
            updatedAt: now,
            lastSeenAt: now
        },
        { merge: true }
    );
}

async function removePushRegistration(uid, fid) {
    if (!uid || !fid) {
        return;
    }

    const tokenId = await hashFid(fid);

    await deleteDoc(doc(db, "users", uid, "pushTokens", tokenId));
}


// ==========================================
// PREFERENCES
// ==========================================

export async function getNotificationPreferences(uid) {
    if (!uid) {
        return { ...DEFAULT_NOTIFICATION_PREFERENCES };
    }

    const snapshot = await getDoc(preferencesRef(uid));

    return normalizeNotificationPreferences(
        snapshot.exists()
            ? snapshot.data()
            : DEFAULT_NOTIFICATION_PREFERENCES
    );
}

export async function saveNotificationPreferences(uid, preferences) {
    if (!uid) {
        throw createPushError(
            "auth/missing-user",
            "Please sign in again."
        );
    }

    const normalized = normalizeNotificationPreferences(preferences);

    await setDoc(
        preferencesRef(uid),
        {
            ...normalized,
            updatedAt: serverTimestamp()
        },
        { merge: true }
    );

    return normalized;
}


// ==========================================
// NOTIFICATION HISTORY
// ==========================================

function mapNotification(documentSnapshot) {
    const data = documentSnapshot.data() || {};
    const createdAt = data.createdAt?.toDate
        ? data.createdAt.toDate()
        : null;
    const readAt = data.readAt?.toDate
        ? data.readAt.toDate()
        : null;

    return {
        id: documentSnapshot.id,
        type: data.type || "notification",
        severity: data.severity || "info",
        title: data.title || "SHOPIX notification",
        message: data.message || "",
        route: data.route || "",
        periodKey: data.periodKey || "",
        warrantyId: data.warrantyId || "",
        expiryDate: data.expiryDate || "",
        stage: data.stage || null,
        createdAt,
        readAt
    };
}

export function subscribeToNotifications(uid, onNext, onError) {
    if (!uid) {
        throw createPushError(
            "auth/missing-user",
            "Please sign in again."
        );
    }

    const notificationsQuery = query(
        notificationsRef(uid),
        orderBy("createdAt", "desc"),
        limit(NOTIFICATION_LIMIT)
    );

    return onSnapshot(
        notificationsQuery,
        function (snapshot) {
            const notifications = snapshot.docs.map(mapNotification);
            onNext(notifications);
        },
        onError
    );
}

export async function markNotificationRead(uid, notificationId) {
    if (!uid || !notificationId) {
        return;
    }

    await updateDoc(
        doc(db, "users", uid, "notifications", notificationId),
        {
            readAt: serverTimestamp()
        }
    );
}

export async function markAllNotificationsRead(uid, notifications) {
    if (!uid || !Array.isArray(notifications)) {
        return;
    }

    const unread = notifications.filter(function (notification) {
        return notification && notification.id && !notification.readAt;
    });

    if (!unread.length) {
        return;
    }

    const batch = writeBatch(db);

    unread.forEach(function (notification) {
        batch.update(
            doc(db, "users", uid, "notifications", notification.id),
            {
                readAt: serverTimestamp()
            }
        );
    });

    await batch.commit();
}

export function getSafeNotificationRoute(route) {
    if (typeof route !== "string" || !route.trim()) {
        return "";
    }

    try {
        const target = new URL(route, window.location.origin);

        if (target.origin !== window.location.origin) {
            return "";
        }

        const allowedPaths = new Set([
            "/reports.html",
            "/warranty.html",
            "/receiptDetails.html",
            "/dashboard.html"
        ]);

        if (!allowedPaths.has(target.pathname)) {
            return "";
        }

        return target.pathname + target.search + target.hash;
    } catch (error) {
        return "";
    }
}


// ==========================================
// PUSH REGISTRATION
// ==========================================

function resolvePushRegistration(fid) {
    if (resolveRegistration) {
        const resolve = resolveRegistration;
        resolveRegistration = null;
        rejectRegistration = null;
        resolve(fid);
    }
}

function rejectPushRegistration(error) {
    if (rejectRegistration) {
        const reject = rejectRegistration;
        resolveRegistration = null;
        rejectRegistration = null;
        reject(error);
    }
}

function ensureMessagingListeners(messaging, uid) {
    if (!registeredUnsubscribe) {
        registeredUnsubscribe = onRegistered(
            messaging,
            async function (fid) {
                const currentUid = pushUid;

                if (!currentUid || !fid) {
                    return;
                }

                try {
                    await storePushRegistration(currentUid, fid);
                    resolvePushRegistration(fid);
                } catch (error) {
                    rejectPushRegistration(error);
                }
            }
        );
    }

    if (!unregisteredUnsubscribe) {
        unregisteredUnsubscribe = onUnregistered(
            messaging,
            async function (fid) {
                const currentUid = pushUid;

                if (!currentUid || !fid) {
                    return;
                }

                try {
                    await removePushRegistration(currentUid, fid);
                } catch (error) {
                    console.warn(
                        "Unable to remove the push registration:",
                        error
                    );
                }
            }
        );
    }

    if (uid) {
        pushUid = uid;
    }
}

async function getMessagingService() {
    if (!isPushConfigured()) {
        throw createPushError(
            "push/not-configured",
            "Push notifications are not configured for this site yet."
        );
    }

    if (!(await isSupported())) {
        throw createPushError(
            "push/unsupported",
            "This browser does not support Firebase push notifications."
        );
    }

    if (!messagingInstance) {
        messagingInstance = getMessaging(app);
    }

    return messagingInstance;
}

function waitForPushRegistration() {
    return new Promise(function (resolve, reject) {
        const timer = window.setTimeout(function () {
            resolveRegistration = null;
            rejectRegistration = null;
            reject(
                createPushError(
                    "push/registration-timeout",
                    "Push registration took too long. Please try again."
                )
            );
        }, PUSH_REGISTRATION_TIMEOUT);

        const cleanup = function (callback) {
            return function (value) {
                window.clearTimeout(timer);
                callback(value);
            };
        };

        resolveRegistration = cleanup(resolve);
        rejectRegistration = cleanup(reject);
    });
}

export async function enablePushNotifications(uid) {
    if (!uid) {
        throw createPushError(
            "auth/missing-user",
            "Please sign in again."
        );
    }

    pushUid = uid;

    const messaging = await getMessagingService();

    if (!("Notification" in window)) {
        throw createPushError(
            "push/unsupported",
            "This browser does not support notifications."
        );
    }

    if (Notification.permission === "denied") {
        throw createPushError(
            "push/permission-denied",
            "Notifications are blocked. Allow them in your browser settings and try again."
        );
    }

    if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();

        if (permission !== "granted") {
            throw createPushError(
                "push/permission-denied",
                "Notification permission was not granted."
            );
        }
    }

    ensureMessagingListeners(messaging, uid);

    const registration = waitForPushRegistration();

    registration.catch(function () {
        // The caller receives the rejection below.
    });

    try {
        await register(messaging, {
            vapidKey: FCM_VAPID_KEY
        });
    } catch (error) {
        rejectPushRegistration(error);
        throw error;
    }

    return registration;
}

export async function disablePushNotifications(uid) {
    if (!uid) {
        throw createPushError(
            "auth/missing-user",
            "Please sign in again."
        );
    }

    if (!isPushConfigured() || !("Notification" in window)) {
        return;
    }

    pushUid = uid;

    const messaging = await getMessagingService();

    ensureMessagingListeners(messaging, uid);

    await unregister(messaging);
}

export function watchPushRegistration(uid) {
    if (!uid || !isPushConfigured() || !("Notification" in window)) {
        return;
    }

    getMessagingService()
        .then(function (messaging) {
            pushUid = uid;
            ensureMessagingListeners(messaging, uid);

            if (Notification.permission === "granted") {
                return enablePushNotifications(uid);
            }
        })
        .catch(function (error) {
            console.warn("Push registration watcher unavailable:", error);
        });
}
