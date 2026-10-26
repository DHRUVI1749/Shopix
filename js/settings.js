import { auth, db, storage } from "./firebase.js";

import {
    onAuthStateChanged,
    sendEmailVerification,
    sendPasswordResetEmail,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
    ref as storageRef,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";

import {
    disablePushNotifications,
    enablePushNotifications,
    getNotificationPreferences,
    isPushConfigured,
    normalizeNotificationPreferences,
    saveNotificationPreferences
} from "./notifications.js";


// ===============================
// ELEMENTS
// ===============================

const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");

const saveProfileBtn = document.getElementById("saveProfileBtn");
const changePasswordBtn = document.getElementById("changePasswordBtn");

const emailVerificationStatus =
    document.getElementById("emailVerificationStatus");
const emailVerificationMessage =
    document.getElementById("emailVerificationMessage");
const sendVerificationBtn =
    document.getElementById("sendVerificationBtn");

const settingsAvatar = document.getElementById("settingsAvatar");
const changeAvatarBtn = document.getElementById("changeAvatarBtn");
const removeAvatarBtn = document.getElementById("removeAvatarBtn");
const avatarInput = document.getElementById("avatarInput");
const avatarMessage = document.getElementById("avatarMessage");

const pushEnabledToggle =
    document.getElementById("pushEnabledToggle");
const monthlyReportsToggle =
    document.getElementById("monthlyReportsToggle");
const warrantyRemindersToggle =
    document.getElementById("warrantyRemindersToggle");
const pushNotificationStatus =
    document.getElementById("pushNotificationStatus");
const pushNotificationMessage =
    document.getElementById("pushNotificationMessage");

let selectedAvatarFile = null;
let avatarRemoved = false;

let notificationSettingsUser = null;
let notificationPreferences =
    normalizeNotificationPreferences();
let pushSettingsBusy = false;


// ===============================
// AVATAR HELPERS
// ===============================

function renderAvatar(photoURL, name) {

    if (!settingsAvatar) {
        return;
    }

    if (photoURL) {

        settingsAvatar.innerHTML = `
            <img src="${photoURL}" alt="Profile photo">
        `;

        return;
    }

    settingsAvatar.textContent =
        (name || "User")
            .charAt(0)
            .toUpperCase();

}

function setAvatarMessage(message, type) {

    if (!avatarMessage) {
        return;
    }

    avatarMessage.textContent = message;

    avatarMessage.className =
        "profile-avatar-message" +
        (type ? " " + type : "");

}


// ===============================
// EMAIL VERIFICATION
// ===============================

function renderEmailVerification(user) {

    if (
        !emailVerificationStatus ||
        !sendVerificationBtn
    ) {
        return;
    }

    const verified =
        user?.emailVerified === true;

    emailVerificationStatus.textContent =
        verified ? "Verified" : "Not verified";

    emailVerificationStatus.className =
        "email-verification-status " +
        (verified ? "verified" : "unverified");

    sendVerificationBtn.hidden =
        verified;

    sendVerificationBtn.disabled =
        false;

    sendVerificationBtn.textContent =
        "Send Verification Email";

}


function setPushNotificationMessage(message, type) {

    if (!pushNotificationMessage) {
        return;
    }

    pushNotificationMessage.textContent = message;

    pushNotificationMessage.className =
        "notification-settings-message" +
        (type ? " " + type : "");

}

function getPushErrorMessage(error) {

    switch (error?.code) {
        case "push/not-configured":
            return "Push notifications are not configured for this deployment yet.";
        case "push/permission-denied":
            return "Notifications are blocked. Allow them in your browser settings and try again.";
        case "push/unsupported":
            return "This browser does not support push notifications.";
        case "push/registration-timeout":
            return "Push registration took too long. Please try again.";
        default:
            return error?.message ||
                "Unable to update push notifications. Please try again.";
    }

}

function getPushStatus() {

    if (!isPushConfigured()) {
        return {
            label: "Setup required",
            className: "unavailable"
        };
    }

    if (!("Notification" in window)) {
        return {
            label: "Unsupported",
            className: "unavailable"
        };
    }

    if (Notification.permission === "denied") {
        return {
            label: "Blocked",
            className: "blocked"
        };
    }

    if (notificationPreferences.pushEnabled) {
        return {
            label: "On",
            className: "on"
        };
    }

    return {
        label: "Off",
        className: "off"
    };
}

function renderNotificationSettings() {

    const configured = isPushConfigured();
    const supported = "Notification" in window;
    const status = getPushStatus();

    if (pushNotificationStatus) {
        pushNotificationStatus.textContent = status.label;
        pushNotificationStatus.className =
            "notification-settings-status " + status.className;
    }

    if (pushEnabledToggle) {
        pushEnabledToggle.checked =
            notificationPreferences.pushEnabled;
        pushEnabledToggle.disabled =
            pushSettingsBusy ||
            !notificationSettingsUser ||
            !configured ||
            !supported;
    }

    if (monthlyReportsToggle) {
        monthlyReportsToggle.checked =
            notificationPreferences.monthlyReports;
        monthlyReportsToggle.disabled =
            pushSettingsBusy ||
            !notificationSettingsUser;
    }

    if (warrantyRemindersToggle) {
        warrantyRemindersToggle.checked =
            notificationPreferences.warrantyReminders;
        warrantyRemindersToggle.disabled =
            pushSettingsBusy ||
            !notificationSettingsUser;
    }

}

async function loadNotificationSettings(user) {

    notificationSettingsUser = null;
    notificationPreferences =
        normalizeNotificationPreferences();

    renderNotificationSettings();

    try {

        notificationPreferences =
            await getNotificationPreferences(user.uid);

        notificationSettingsUser = user;

        renderNotificationSettings();

        if (!isPushConfigured()) {
            setPushNotificationMessage(
                "Push notifications are not available in this deployment yet. Your category preferences are still saved.",
                ""
            );
        }

    }
    catch (error) {

        console.error(
            "Unable to load notification settings:",
            error
        );

        setPushNotificationMessage(
            "Unable to load notification settings. Please refresh and try again.",
            "error"
        );

    }

}

async function handlePushToggle() {

    const user = notificationSettingsUser;
    const wantsPush = pushEnabledToggle?.checked === true;

    if (!user || !pushEnabledToggle || pushSettingsBusy) {
        renderNotificationSettings();
        return;
    }

    pushSettingsBusy = true;

    pushEnabledToggle.disabled = true;

    setPushNotificationMessage(
        wantsPush ? "Enabling push notifications..." : "Disabling push notifications...",
        ""
    );

    try {

        if (wantsPush) {

            await enablePushNotifications(user.uid);

            notificationPreferences =
                await saveNotificationPreferences(
                    user.uid,
                    {
                        ...notificationPreferences,
                        pushEnabled: true
                    }
                );

            setPushNotificationMessage(
                "Push notifications are on for this browser.",
                "success"
            );

        }
        else {

            let cleanupError = null;

            try {
                await disablePushNotifications(user.uid);
            }
            catch (error) {
                cleanupError = error;
                console.warn(
                    "Browser push registration cleanup failed:",
                    error
                );
            }

            notificationPreferences =
                await saveNotificationPreferences(
                    user.uid,
                    {
                        ...notificationPreferences,
                        pushEnabled: false
                    }
                );

            setPushNotificationMessage(
                cleanupError
                    ? "Push notifications are off for your account. Browser cleanup failed, but no new pushes will be sent."
                    : "Push notifications are off.",
                cleanupError ? "error" : "success"
            );

        }

    }
    catch (error) {

        console.error(
            "Unable to update push notifications:",
            error
        );

        pushEnabledToggle.checked =
            notificationPreferences.pushEnabled;

        setPushNotificationMessage(
            getPushErrorMessage(error),
            "error"
        );

    }
    finally {

        pushSettingsBusy = false;

        renderNotificationSettings();

    }

}

async function handleCategoryToggle() {

    const user = notificationSettingsUser;

    if (!user || pushSettingsBusy) {
        renderNotificationSettings();
        return;
    }

    const previous = notificationPreferences;

    const next = {
        ...notificationPreferences,
        monthlyReports:
            monthlyReportsToggle?.checked !== false,
        warrantyReminders:
            warrantyRemindersToggle?.checked !== false
    };

    pushSettingsBusy = true;
    notificationPreferences = next;

    renderNotificationSettings();

    try {

        notificationPreferences =
            await saveNotificationPreferences(
                user.uid,
                next
            );

        setPushNotificationMessage(
            "Notification preferences saved.",
            "success"
        );

    }
    catch (error) {

        console.error(
            "Unable to save notification preferences:",
            error
        );

        notificationPreferences = previous;

        setPushNotificationMessage(
            "Unable to save notification preferences. Please try again.",
            "error"
        );

    }
    finally {

        pushSettingsBusy = false;

        renderNotificationSettings();

    }

}


// ===============================
// LOAD USER DATA
// ===============================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.href = "index.html";

        return;
    }

    try {

        // Email from Firebase Authentication
        userEmail.value = user.email || "";

        renderEmailVerification(user);

        // Get user document from Firestore
        const userRef = doc(db, "users", user.uid);

        const userSnap = await getDoc(userRef);

        let profileName =
            user.displayName || "";

        if (userSnap.exists()) {

            const userData = userSnap.data();

            profileName =
                userData.name || profileName;

        }

        userName.value = profileName;

        avatarRemoved = false;

        selectedAvatarFile = null;

        renderAvatar(
            user.photoURL,
            profileName
        );

        loadNotificationSettings(user);

    } catch (error) {

        console.error("Error loading user data:", error);

    }

});


pushEnabledToggle?.addEventListener(
    "change",
    handlePushToggle
);

monthlyReportsToggle?.addEventListener(
    "change",
    handleCategoryToggle
);

warrantyRemindersToggle?.addEventListener(
    "change",
    handleCategoryToggle
);


// ===============================
// AVATAR EVENTS
// ===============================

changeAvatarBtn?.addEventListener("click", () => {

    avatarInput?.click();

});

avatarInput?.addEventListener("change", () => {

    const file = avatarInput.files[0];

    if (!file) {
        return;
    }

    if (!file.type.startsWith("image/")) {

        setAvatarMessage(
            "Please select an image file.",
            "error"
        );

        avatarInput.value = "";

        return;
    }

    selectedAvatarFile = file;

    avatarRemoved = false;

    renderAvatar(
        URL.createObjectURL(file),
        userName.value
    );

    setAvatarMessage(
        "Photo selected. Click Save Changes to save it.",
        "success"
    );

});

removeAvatarBtn?.addEventListener("click", () => {

    const user = auth.currentUser;

    selectedAvatarFile = null;

    avatarRemoved = true;

    if (avatarInput) {
        avatarInput.value = "";
    }

    renderAvatar(
        null,
        user?.displayName || userName.value
    );

    setAvatarMessage(
        "Photo removed. Click Save Changes to confirm.",
        "success"
    );

});


// ===============================
// SAVE PROFILE
// ===============================

saveProfileBtn.addEventListener("click", async () => {

    const user = auth.currentUser;

    if (!user) {

        alert("Please login first.");

        return;
    }

    const name = userName.value.trim();

    if (name === "") {

        alert("Please enter your name.");

        return;
    }

    try {

        saveProfileBtn.disabled = true;

        saveProfileBtn.textContent = "Saving...";

        let photoURL = user.photoURL || null;

        if (avatarRemoved) {

            try {

                const oldAvatarRef = storageRef(
                    storage,
                    "avatars/" + user.uid + "/profile.jpg"
                );

                await deleteObject(oldAvatarRef);

            } catch (error) {

                console.log("No old avatar found.");

            }

            photoURL = null;

        }

        if (selectedAvatarFile) {

            const avatarRef = storageRef(
                storage,
                "avatars/" + user.uid + "/profile.jpg"
            );

            await uploadBytes(
                avatarRef,
                selectedAvatarFile
            );

            photoURL = await getDownloadURL(avatarRef);

        }

        await updateProfile(
            user,
            {
                displayName: name,
                photoURL: photoURL
            }
        );

        const userRef = doc(db, "users", user.uid);

        await setDoc(
            userRef,
            {
                name: name
            },
            {
                merge: true
            }
        );

        renderAvatar(photoURL, name);

        selectedAvatarFile = null;

        avatarRemoved = false;

        if (avatarInput) {
            avatarInput.value = "";
        }

        setAvatarMessage(
            "Profile updated successfully.",
            "success"
        );

    } catch (error) {

        console.error("Error saving profile:", error);

        setAvatarMessage(
            "Unable to save profile. Please try again.",
            "error"
        );

        alert("Unable to save profile. Please try again.");

    } finally {

        saveProfileBtn.disabled = false;

        saveProfileBtn.textContent = "Save Changes";

    }

});


// ===============================
// CHANGE PASSWORD
// ===============================

changePasswordBtn.addEventListener("click", async () => {

    const user = auth.currentUser;

    if (!user || !user.email) {

        alert("Please login first.");

        return;
    }

    try {

        await sendPasswordResetEmail(auth, user.email);

        alert(
            "Password reset link has been sent to your registered email."
        );

    } catch (error) {

        console.error("Password reset error:", error);

        alert(
            "Unable to send password reset email. Please try again."
        );

    }

});


// ===============================
// SEND EMAIL VERIFICATION
// ===============================

sendVerificationBtn?.addEventListener("click", async () => {

    const user = auth.currentUser;

    if (!user || !user.email) {

        if (emailVerificationMessage) {
            emailVerificationMessage.textContent =
                "Please login first.";
            emailVerificationMessage.className =
                "email-verification-message error";
        }

        return;
    }

    if (user.emailVerified) {

        renderEmailVerification(user);

        return;
    }

    sendVerificationBtn.disabled = true;
    sendVerificationBtn.textContent = "Sending...";

    if (emailVerificationMessage) {
        emailVerificationMessage.textContent = "";
        emailVerificationMessage.className =
            "email-verification-message";
    }

    try {

        await sendEmailVerification(user);

        if (emailVerificationMessage) {
            emailVerificationMessage.textContent =
                "Verification email sent. Check your inbox and spam folder.";
            emailVerificationMessage.className =
                "email-verification-message success";
        }

        sendVerificationBtn.textContent =
            "Resend Verification Email";

    } catch (error) {

        console.error("Email verification error:", error);

        if (emailVerificationMessage) {

            emailVerificationMessage.textContent =
                error.code === "auth/too-many-requests" ?
                "Too many requests. Please wait a few minutes and try again." :
                "Unable to send the verification email. Please try again.";

            emailVerificationMessage.className =
                "email-verification-message error";

        }

        sendVerificationBtn.textContent =
            "Send Verification Email";

    } finally {

        sendVerificationBtn.disabled = false;

    }

});