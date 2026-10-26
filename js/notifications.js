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
    onMessage,
    onRegistered,
    onUnregistered,
    register,
    unregister
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging.js";

import {
    createForegroundGate,
    isForegroundVisible,
    normalizeForegroundPayload
} from "./notification-foreground.mjs";


// ==========================================
// CONFIGURATION
// ==========================================

// Paste the Web Push certificate public key from
// Firebase Console > Project settings > Cloud
// Messaging > Web Push certificates.
export const FCM_VAPID_KEY = "BCNM03pYXaHIQzX_RieM2iA0kc_pxedNv7vqNPi1FMR2Ws_MV8s9SNMngwI9C9TqJT7NTJp05iNHUluDeDeccIg";

const PUSH_REGISTRATION_TIMEOUT = 20000;
const PUSH_UNREGISTER_TIMEOUT = 5000;
const FOREGROUND_TOAST_DURATION = 8000;
const NOTIFICATION_LIMIT = 50;
const USER_AGENT_LIMIT = 400;

export const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
    pushEnabled: false,
    monthlyReports: true,
    warrantyReminders: true
});

let messagingInstance = null;
let messageUnsubscribe = null;
let registeredUnsubscribe = null;
let unregisteredUnsubscribe = null;
let pushUid = null;
let pushRegistrationIntent = null;
let pushRegistrationGeneration = 0;
let resolveRegistration = null;
let rejectRegistration = null;
let finishUnregisterCleanup = null;

const foregroundGate = createForegroundGate();


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

function handleNotificationClickMessage(event) {
    const payload = event.data;

    if (
        !payload ||
        payload.isFirebaseMessaging !== true ||
        payload.messageType !== "notification-clicked"
    ) {
        return;
    }

    const data = payload.data && typeof payload.data === "object"
        ? payload.data
        : {};
    const link = payload.fcmOptions &&
        typeof payload.fcmOptions.link === "string"
        ? payload.fcmOptions.link
        : "";
    const route =
        getSafeNotificationRoute(link) ||
        getSafeNotificationRoute(data.route);

    if (!route) {
        return;
    }

    const uid = pushUid;
    const notificationId =
        typeof data.notificationId === "string" &&
        data.notificationId.length <= 200
            ? data.notificationId
            : "";

    if (uid && notificationId) {
        markNotificationRead(uid, notificationId).catch(function (error) {
            console.warn(
                "Unable to mark the clicked notification as read:",
                error
            );
        });
    }

    window.location.assign(route);
}

if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener(
        "message",
        handleNotificationClickMessage
    );
}


// ==========================================
// FOREGROUND NOTIFICATIONS
// ==========================================

function getToastRegion() {
    let region = document.getElementById("shopixToastRegion");

    if (region) {
        return region;
    }

    region = document.createElement("div");
    region.id = "shopixToastRegion";
    region.className = "shopix-toast-region";
    region.setAttribute("role", "region");
    region.setAttribute("aria-label", "Notifications");

    document.body.appendChild(region);
    return region;
}

function removeForegroundToast(toast) {
    if (!toast || !toast.isConnected) {
        return;
    }

    toast.remove();

    const region = document.getElementById("shopixToastRegion");

    if (region && !region.children.length) {
        region.remove();
    }
}

async function openForegroundNotification(uid, notification) {
    const route = getSafeNotificationRoute(notification.route);

    if (!route) {
        return;
    }

    try {
        await markNotificationRead(uid, notification.id);
    } catch (error) {
        console.warn(
            "Unable to mark the foreground notification as read:",
            error
        );
    }

    window.location.assign(route);
}

function showForegroundToast(uid, notification) {
    const region = getToastRegion();
    const toast = document.createElement("div");
    const icon = document.createElement("span");
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    const body = document.createElement("p");
    const closeButton = document.createElement("button");
    const route = getSafeNotificationRoute(notification.route);

    toast.className = "shopix-toast";
    toast.setAttribute("role", "status");

    icon.className = "shopix-toast-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "!";

    copy.className = "shopix-toast-copy";
    title.textContent = notification.title;
    body.textContent = notification.body;

    closeButton.type = "button";
    closeButton.className = "shopix-toast-close";
    closeButton.setAttribute("aria-label", "Dismiss notification");
    closeButton.textContent = "\u00d7";

    copy.appendChild(title);
    copy.appendChild(body);

    if (route) {
        const action = document.createElement("button");

        action.type = "button";
        action.className = "shopix-toast-action";
        action.textContent = "View";
        action.addEventListener("click", function () {
            openForegroundNotification(uid, {
                ...notification,
                route
            });
        });

        copy.appendChild(action);
    }

    toast.appendChild(icon);
    toast.appendChild(copy);
    toast.appendChild(closeButton);
    region.appendChild(toast);

    const timer = window.setTimeout(function () {
        removeForegroundToast(toast);
    }, FOREGROUND_TOAST_DURATION);

    closeButton.addEventListener("click", function () {
        window.clearTimeout(timer);
        removeForegroundToast(toast);
    });
}

async function handleForegroundMessage(payload) {
    const uid = pushUid;

    if (!uid || !isForegroundVisible(document)) {
        return;
    }

    try {
        const preferences = await getNotificationPreferences(uid);

        if (pushUid !== uid) {
            return;
        }

        if (!foregroundGate.shouldShow(payload, preferences)) {
            return;
        }

        showForegroundToast(uid, normalizeForegroundPayload(payload));
    } catch (error) {
        console.warn(
            "Unable to display the foreground notification:",
            error
        );
    }
}

export function watchForegroundNotifications(uid) {
    if (!uid || !isPushConfigured()) {
        return;
    }

    getMessagingService()
        .then(function (messaging) {
            if (pushUid && pushUid !== uid) {
                foregroundGate.reset();
            }

            pushUid = uid;
            ensureMessagingListeners(messaging, uid);
        })
        .catch(function (error) {
            console.warn(
                "Foreground notification watcher unavailable:",
                error
            );
        });
}

export function stopForegroundNotifications() {
    pushUid = null;
    pushRegistrationIntent = null;
    pushRegistrationGeneration += 1;
    foregroundGate.reset();

    if (messageUnsubscribe) {
        messageUnsubscribe();
        messageUnsubscribe = null;
    }

    const region = document.getElementById("shopixToastRegion");

    if (region) {
        region.remove();
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

function waitForUnregisterCleanup() {
    if (finishUnregisterCleanup) {
        finishUnregisterCleanup();
    }

    return new Promise(function (resolve) {
        const timer = window.setTimeout(function () {
            finishUnregisterCleanup = null;
            resolve();
        }, PUSH_UNREGISTER_TIMEOUT);

        finishUnregisterCleanup = function () {
            window.clearTimeout(timer);
            finishUnregisterCleanup = null;
            resolve();
        };
    });
}

function completeUnregisterCleanup() {
    if (finishUnregisterCleanup) {
        finishUnregisterCleanup();
    }
}

function ensureMessagingListeners(messaging, uid) {
    if (!messageUnsubscribe) {
        messageUnsubscribe = onMessage(
            messaging,
            function (payload) {
                handleForegroundMessage(payload);
            }
        );
    }

    if (!registeredUnsubscribe) {
        registeredUnsubscribe = onRegistered(
            messaging,
            async function (fid) {
                const currentUid = pushUid;

                if (
                    !currentUid ||
                    !fid ||
                    pushRegistrationIntent !== "register"
                ) {
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
                    completeUnregisterCleanup();
                    return;
                }

                try {
                    await removePushRegistration(currentUid, fid);
                } catch (error) {
                    console.warn(
                        "Unable to remove the push registration:",
                        error
                    );
                } finally {
                    completeUnregisterCleanup();
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

    pushRegistrationIntent = "register";
    pushRegistrationGeneration += 1;

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
    pushRegistrationIntent = "unregister";
    pushRegistrationGeneration += 1;

    const messaging = await getMessagingService();

    ensureMessagingListeners(messaging, uid);

    const cleanup = waitForUnregisterCleanup();

    try {
        await unregister(messaging);
    } catch (error) {
        completeUnregisterCleanup();
        throw error;
    }

    await cleanup;
}

export function watchPushRegistration(uid) {
    if (
        !uid ||
        !isPushConfigured() ||
        !("Notification" in window) ||
        Notification.permission !== "granted" ||
        pushRegistrationIntent === "unregister"
    ) {
        return;
    }

    if (pushUid && pushUid !== uid) {
        foregroundGate.reset();
    }

    const generation = ++pushRegistrationGeneration;

    pushUid = uid;

    getNotificationPreferences(uid)
        .then(function (preferences) {
            if (
                generation !== pushRegistrationGeneration ||
                pushUid !== uid ||
                !preferences.pushEnabled
            ) {
                return null;
            }

            return getMessagingService();
        })
        .then(function (messaging) {
            if (
                !messaging ||
                generation !== pushRegistrationGeneration ||
                pushUid !== uid
            ) {
                return null;
            }

            pushRegistrationIntent = "register";
            ensureMessagingListeners(messaging, uid);

            return register(messaging, {
                vapidKey: FCM_VAPID_KEY
            });
        })
        .catch(function (error) {
            console.warn(
                "Push registration refresh unavailable:",
                error
            );
        });
}
