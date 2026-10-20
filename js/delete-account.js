// ==========================================
// SHOPIX - DELETE ACCOUNT
//
// This module holds the complete account
// deletion flow: the confirmation dialog, the
// password re-authentication, the Firestore
// cleanup, the avatar cleanup, the Realtime
// Database cleanup and the error handling.
//
// The logic was moved here from dashboard.js
// without any change, so every page that uses the
// global sidebar gets exactly the same behaviour.
// ==========================================

import {
    app,
    auth,
    storage,
    rtdb
} from "./firebase.js";

import {
    getFirestore,
    collection,
    getDocs,
    getDoc,
    doc,
    deleteDoc,
    writeBatch
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
    signOut,
    deleteUser,
    reauthenticateWithCredential,
    reauthenticateWithPopup,
    EmailAuthProvider,
    GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    ref as storageRef,
    deleteObject,
    getMetadata
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";

import {
    ref as databaseRef,
    remove
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";


const db = getFirestore(app);


// The dialog is created only when the page does not
// already have it. The Dashboard page ships the
// markup in its HTML, every other page gets the
// exact same dialog from here.

function ensureDeleteAccountModal() {

    if (document.getElementById("deleteAccountModal")) {
        return;
    }

    const wrapper = document.createElement("div");

    wrapper.innerHTML = `
        <div class="delete-modal-card">

            <div class="delete-modal-icon">
                <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true">

                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>

                </svg>
            </div>

            <h2>Delete Account</h2>

            <p class="delete-modal-text">
                This action is permanent and cannot be
                undone. Deleting your account will
                permanently erase the following data
                from SHOPIX.
            </p>

            <ul class="delete-modal-list">
                <li>Your profile information</li>
                <li>All uploaded receipts</li>
                <li>All warranty records</li>
                <li>Your profile avatar</li>
            </ul>

            <div id="deleteAccountPasswordBlock" style="display:none;">

                <label
                    class="delete-modal-label"
                    for="deleteAccountPassword">
                    Confirm your password
                </label>

                <input
                    type="password"
                    id="deleteAccountPassword"
                    class="delete-modal-input"
                    placeholder="Enter your password"
                    autocomplete="current-password">

            </div>

            <div id="deleteAccountMessage" class="delete-modal-message"></div>

            <div class="delete-modal-actions">

                <button
                    type="button"
                    id="deleteAccountCancel"
                    class="delete-modal-cancel">
                    Cancel
                </button>

                <button
                    type="button"
                    id="deleteAccountConfirm"
                    class="delete-modal-confirm">
                    Delete Account
                </button>

            </div>

        </div>
    `;

    const modal = document.createElement("div");

    modal.id = "deleteAccountModal";
    modal.className = "delete-modal";
    modal.style.display = "none";

    modal.appendChild(wrapper.firstElementChild);

    document.body.appendChild(modal);

}


let deleteAccountReady = false;

export function initDeleteAccount() {

    if (deleteAccountReady) {
        return;
    }

    deleteAccountReady = true;

    ensureDeleteAccountModal();
    // ==========================================
    // DELETE ACCOUNT
    // ==========================================

    // Sub-collections stored under users/{uid}.
    // These names come from the existing project code:
    //   - receipts   (receiptScanner, receiptHistory,
    //                 receiptDetails, reports, expenses,
    //                 expenseAnalytics, smart-insights,
    //                 warranty, dashboard)
    //   - warranties (warranty, dashboard)
    //
    // Firestore does NOT remove sub-collections when
    // the parent document is deleted, so every one of
    // them has to be deleted explicitly.

    const USER_SUBCOLLECTIONS = [
        "receipts",
        "warranties"
    ];

    const deleteAccountButton =
        document.getElementById("deleteAccountBtn");

    const deleteAccountModal =
        document.getElementById("deleteAccountModal");

    const deleteAccountCancel =
        document.getElementById("deleteAccountCancel");

    const deleteAccountConfirm =
        document.getElementById("deleteAccountConfirm");

    const deleteAccountPasswordBlock =
        document.getElementById(
            "deleteAccountPasswordBlock"
        );

    const deleteAccountPassword =
        document.getElementById("deleteAccountPassword");

    const deleteAccountMessage =
        document.getElementById("deleteAccountMessage");

    let deleteAccountBusy = false;


    // ==========================================
    // DELETE ACCOUNT - UI HELPERS
    // ==========================================

    function setDeleteAccountMessage(text, type) {

        if (!deleteAccountMessage) {
            return;
        }

        deleteAccountMessage.textContent =
            text || "";

        deleteAccountMessage.className =
            "delete-modal-message" +
            (type ? " " + type : "");

    }

    function setDeleteAccountBusy(busy) {

        if (deleteAccountConfirm) {
            deleteAccountConfirm.disabled = busy;

            deleteAccountConfirm.textContent =
                busy ?
                "Deleting..." :
                "Delete Account";
        }

        if (deleteAccountCancel) {
            deleteAccountCancel.disabled = busy;
        }

        if (deleteAccountButton) {
            deleteAccountButton.disabled = busy;
        }

    }

    function isPasswordUser(user) {

        if (!user || !user.providerData) {
            return false;
        }

        return user.providerData.some(
            function (provider) {
                return provider.providerId === "password";
            }
        );

    }

    function openDeleteAccountModal() {

        // A deletion is already running, so the
        // dialog must not be reopened.

        if (deleteAccountBusy) {
            return;
        }

        const user = auth.currentUser;

        if (!user) {
            window.location.replace("loginpg.html");
            return;
        }

        if (deleteAccountPassword) {
            deleteAccountPassword.value = "";
        }

        setDeleteAccountMessage("", "");

        // Only email / password users type a
        // password. Google users are re-authenticated
        // through a popup instead.

        if (deleteAccountPasswordBlock) {
            deleteAccountPasswordBlock.style.display =
                isPasswordUser(user) ? "block" : "none";
        }

        if (deleteAccountModal) {
            deleteAccountModal.style.display = "flex";
        }

        if (deleteAccountPassword) {
            deleteAccountPassword.focus();
        }

    }

    function closeDeleteAccountModal() {

        // Never close the dialog while a deletion
        // is still running.

        if (deleteAccountBusy) {
            return;
        }

        if (deleteAccountModal) {
            deleteAccountModal.style.display = "none";
        }

        if (deleteAccountPassword) {
            deleteAccountPassword.value = "";
        }

    }


    // ==========================================
    // DELETE ACCOUNT - RE-AUTHENTICATION
    // ==========================================

    async function reauthenticateUser(user) {

        const providers =
            user.providerData || [];

        const passwordProvider =
            providers.find(
                function (provider) {
                    return provider.providerId === "password";
                }
            );


        // --------------------------------
        // EMAIL / PASSWORD USER
        // --------------------------------

        if (passwordProvider) {

            const password =
                deleteAccountPassword ?
                deleteAccountPassword.value :
                "";

            if (!password) {
                throw new Error(
                    "Please enter your password to confirm the deletion."
                );
            }

            await reauthenticateWithCredential(
                user,
                EmailAuthProvider.credential(
                    user.email,
                    password
                )
            );

            return;

        }


        // --------------------------------
        // GOOGLE USER
        // --------------------------------

        const googleProvider =
            providers.find(
                function (provider) {
                    return provider.providerId === "google.com";
                }
            );

        if (googleProvider) {

            await reauthenticateWithPopup(
                user,
                new GoogleAuthProvider()
            );

            return;

        }


        // --------------------------------
        // UNSUPPORTED PROVIDER
        // --------------------------------

        throw new Error(
            "Your sign-in provider cannot be verified automatically. " +
            "Please sign out, sign in again and then delete your account."
        );

    }


    // ==========================================
    // DELETE ACCOUNT - FIRESTORE
    // ==========================================

    // A cleanup error that knows which document
    // path failed and why, so the user gets an
    // accurate message instead of a generic one.

    class AccountCleanupError extends Error {

        constructor(message, path, cause) {

            super(message);

            this.name = "AccountCleanupError";

            this.path = path;

            this.cause = cause;

            this.code =
                cause && cause.code ?
                cause.code :
                null;

        }

    }

    async function deleteCollectionDocuments(collectionRef, path) {

        // --------------------------------
        // READ
        // --------------------------------

        let snapshot = null;

        try {

            snapshot =
                await getDocs(collectionRef);

        }
        catch (error) {

            throw new AccountCleanupError(
                "Your " + path + " records could not be read.",
                path,
                error
            );

        }

        if (snapshot.empty) {
            return 0;
        }

        const documents =
            snapshot.docs;

        // A Firestore batch accepts up to 500 writes,
        // so the documents are removed in chunks.

        const CHUNK_SIZE = 400;

        for (
            let index = 0;
            index < documents.length;
            index += CHUNK_SIZE
        ) {

            const chunk =
                documents.slice(
                    index,
                    index + CHUNK_SIZE
                );

            const batch =
                writeBatch(db);

            chunk.forEach(
                function (documentSnapshot) {
                    batch.delete(documentSnapshot.ref);
                }
            );

            // --------------------------------
            // DELETE
            // --------------------------------

            try {

                await batch.commit();

            }
            catch (error) {

                throw new AccountCleanupError(
                    "Your " + path + " records could not be deleted.",
                    path,
                    error
                );

            }

        }

        return documents.length;

    }

    async function deleteUserFirestoreData(user, onProgress) {

        const counts = {
            receipts: 0,
            warranties: 0
        };

        // --------------------------------
        // PROFILE DOCUMENT
        //
        // users/{uid} is deleted first on
        // purpose. Firestore does not cascade
        // deletes to sub-collections, so the
        // order does not affect the result,
        // but if the security rules do not
        // allow this delete the flow stops
        // here, before any record is lost.
        // --------------------------------

        onProgress(
            "Deleting profile data..."
        );

        const profilePath =
            "users/" + user.uid;

        const profileRef =
            doc(db, "users", user.uid);

        // --------------------------------
        // The profile document is only
        // created when the user saves their
        // name in Settings, so it often does
        // not exist. A delete is only sent
        // when there is really something to
        // remove.
        // --------------------------------

        let profileExists = false;

        try {

            const profileSnapshot =
                await getDoc(profileRef);

            profileExists =
                profileSnapshot.exists();

        }
        catch (error) {

            throw new AccountCleanupError(
                "Your profile document (" + profilePath + ") could not be read.",
                profilePath,
                error
            );

        }

        if (profileExists) {

            try {

                await deleteDoc(profileRef);

            }
            catch (error) {

                throw new AccountCleanupError(
                    "Your profile document (" + profilePath + ") could not be deleted.",
                    profilePath,
                    error
                );

            }

        }

        // --------------------------------
        // SUB-COLLECTIONS
        // --------------------------------

        for (
            const subCollection of USER_SUBCOLLECTIONS
        ) {

            onProgress(
                "Deleting " + subCollection + "..."
            );

            const path =
                "users/" + user.uid + "/" + subCollection;

            counts[subCollection] =
                await deleteCollectionDocuments(
                    collection(
                        db,
                        "users",
                        user.uid,
                        subCollection
                    ),
                    path
                );

        }

        return counts;

    }


    // ==========================================
    // DELETE ACCOUNT - STEP HELPERS
    // ==========================================

    // Every step gets its own limit. The limit does
    // NOT pretend the step worked: it rejects with a
    // real error, so the flow stops, the buttons come
    // back and the user sees what happened.

    const DELETE_STEP_TIMEOUTS = {
        firestore: 30000,
        storage: 15000,
        realtime: 15000,
        auth: 20000
    };

    function withTimeout(promise, milliseconds, label) {

        let timer = null;

        const timeout = new Promise(
            function (resolve, reject) {

                timer = setTimeout(
                    function () {

                        // The modal already shows the
                        // exact sub step that is running,
                        // so the error names it.

                        const current =
                            deleteAccountMessage ?
                            deleteAccountMessage.textContent :
                            "";

                        const step =
                            current ?
                            current.replace(/\.\.\.$/, "") :
                            label;

                        const seconds =
                            Math.max(
                                1,
                                Math.round(milliseconds / 1000)
                            );

                        reject(
                            new Error(
                                step + " did not respond within " +
                                seconds +
                                (seconds === 1 ? " second. " : " seconds. ") +
                                "Please try again."
                            )
                        );

                    },
                    milliseconds
                );

            }
        );

        return Promise.race([promise, timeout])
            .finally(
                function () {

                    if (timer) {
                        clearTimeout(timer);
                    }

                }
            );

    }


    // Runs one deletion step: shows progress, keeps
    // a console trail and never hangs forever.

    async function runDeleteStep(label, timeoutKey, operation) {

        setDeleteAccountMessage(
            label + "...",
            "info"
        );

        console.log(
            "[SHOPIX delete] START  " + label
        );

        const startedAt = Date.now();

        try {

            const result =
                await withTimeout(
                    operation(),
                    DELETE_STEP_TIMEOUTS[timeoutKey],
                    label
                );

            console.log(
                "[SHOPIX delete] DONE   " + label +
                " (" + (Date.now() - startedAt) + "ms)"
            );

            return result;

        }
        catch (error) {

            console.error(
                "[SHOPIX delete] FAILED " + label +
                " (" + (Date.now() - startedAt) + "ms)",
                error && error.code ?
                    error.code + " - " + error.message :
                    error
            );

            throw error;

        }

    }


    // ==========================================
    // DELETE ACCOUNT - STORAGE
    // ==========================================

    // The app stores exactly one file per user:
    // avatars/{uid}/profile.jpg
    // (see the avatar upload and the "Remove Avatar"
    // button in this file).
    //
    // The file is looked up BEFORE it is deleted. A user
    // without an avatar then never triggers a delete
    // request at all, so a missing file is a normal
    // result instead of an error, and the Storage
    // service is only asked to delete something that
    // is really there.
    //
    // The lookup only needs the same read permission the
    // app already uses to show the avatar
    // (getDownloadURL), so no new rule is needed.

    const AVATAR_FILE_NAME = "profile.jpg";

    async function deleteUserStorageFiles(user) {

        const avatarPath =
            "avatars/" + user.uid + "/" + AVATAR_FILE_NAME;

        const avatarRef =
            storageRef(
                storage,
                avatarPath
            );


        // --------------------------------
        // CHECK IF THE AVATAR EXISTS
        // --------------------------------

        try {

            await getMetadata(avatarRef);

        }
        catch (error) {

            // No avatar file, so there is nothing to
            // remove. This is the normal case for most
            // users and it must never block the
            // account deletion.

            if (
                error.code ===
                "storage/object-not-found"
            ) {

                console.log(
                    "[SHOPIX delete] No avatar stored for this user, nothing to remove."
                );

                return 0;

            }

            // The Storage service is unreachable, the
            // bucket is missing or the rules deny the
            // read. The avatar is optional, so the
            // caller reports it and carries on.

            throw error;

        }


        // --------------------------------
        // DELETE THE AVATAR
        // --------------------------------

        await deleteObject(avatarRef);

        return 1;

    }


    // ==========================================
    // DELETE ACCOUNT - REALTIME DATABASE
    // ==========================================

    async function deleteUserRealtimeData(user) {

        await remove(
            databaseRef(
                rtdb,
                "users/" + user.uid
            )
        );

    }


    // ==========================================
    // DELETE ACCOUNT - LOCAL STORAGE
    // ==========================================

    function clearUserLocalData(uid) {

        try {

            // Notification read state is stored
            // per user id.

            localStorage.removeItem(
                "shopix_read_notifications_" + uid
            );

            localStorage.removeItem(
                "selectedReceiptId"
            );

        }
        catch (error) {

            console.warn(
                "Unable to clear local data:",
                error
            );

        }

    }


    // A short, friendly reason for the avatar not being
    // removed. The full technical detail stays in the
    // console.

    function getAvatarFailureReason(error) {

        if (!error) {
            return "";
        }

        if (
            error.message &&
            error.message.indexOf("did not respond") > -1
        ) {
            return " (the request timed out)";
        }

        if (
            error.code ===
                "storage/unknown" ||
            error.code ===
                "storage/bucket-not-found"
        ) {
            return " (cloud storage was unreachable)";
        }

        if (
            error.code ===
                "storage/unauthorized" ||
            error.code ===
                "storage/forbidden"
        ) {
            return " (cloud storage permission was denied)";
        }

        return "";

    }


    // ==========================================
    // DELETE ACCOUNT - MAIN FLOW
    // ==========================================

    // A final safety net. Every step already has its own
    // limit, so this only runs if something outside those
    // steps gets stuck. It restores the buttons and reports
    // the problem, it never claims the account was deleted.

    let deleteAccountWatchdog = null;

    function startDeleteAccountWatchdog() {

        stopDeleteAccountWatchdog();

        deleteAccountWatchdog =
            setTimeout(
                function () {

                    console.error(
                        "[SHOPIX delete] The deletion did not finish in time, the modal was reset."
                    );

                    deleteAccountBusy = false;

                    setDeleteAccountBusy(false);

                    setDeleteAccountMessage(
                        "This took too long and was stopped. Please try again.",
                        "error"
                    );

                },
                90000
            );

    }

    function stopDeleteAccountWatchdog() {

        if (deleteAccountWatchdog) {
            clearTimeout(deleteAccountWatchdog);
            deleteAccountWatchdog = null;
        }

    }

    async function performAccountDeletion() {

        if (deleteAccountBusy) {
            return;
        }

        const user = auth.currentUser;

        if (!user) {
            closeDeleteAccountModal();
            window.location.replace("loginpg.html");
            return;
        }

        deleteAccountBusy = true;

        setDeleteAccountBusy(true);

        startDeleteAccountWatchdog();

        const deleted = {
            firestore: false,
            storage: false,
            auth: false
        };

        const warnings = [];

        let accountDeletedSuccessfully = false;

        try {

            // ==================================
            // 1. RE-AUTHENTICATE THE USER
            // ==================================

            await runDeleteStep(
                "Verifying your identity",
                "auth",
                function () {
                    return reauthenticateUser(user);
                }
            );


            // ==================================
            // 2. DELETE FIRESTORE DATA
            //
            // This is required cleanup. If it
            // fails the Firebase Auth account
            // is kept, so the user can fix the
            // rules and try again without
            // losing the ability to reach the
            // remaining data.
            // ==================================

            const counts =
                await runDeleteStep(
                    "Deleting your receipts and warranties",
                    "firestore",
                    function () {
                        return deleteUserFirestoreData(
                            user,
                            function (message) {
                                setDeleteAccountMessage(
                                    message,
                                    "info"
                                );
                            }
                        );
                    }
                );

            deleted.firestore = true;

            console.log(
                "[SHOPIX delete] Firestore records removed:",
                counts
            );


            // ==================================
            // 3. DELETE STORAGE FILES
            //
            // The avatar is optional, so a
            // failure here is reported as a
            // warning and does not block the
            // account deletion.
            // ==================================

            try {

                const fileCount =
                    await runDeleteStep(
                        "Deleting your avatar",
                        "storage",
                        function () {
                            return deleteUserStorageFiles(user);
                        }
                    );

                deleted.storage = true;

                console.log(
                    "[SHOPIX delete] Storage files removed:",
                    fileCount
                );

            }
            catch (storageError) {

                console.error(
                    "[SHOPIX delete] Storage cleanup failed:",
                    storageError && storageError.code ?
                        storageError.code + " - " + storageError.message :
                        storageError
                );

                console.warn(
                    "[SHOPIX delete] The avatar is optional, so the account deletion continues."
                );

                warnings.push(
                    "your avatar" + getAvatarFailureReason(storageError)
                );

            }


            // ==================================
            // 4. DELETE REALTIME DATABASE DATA
            //
            // This is an older copy of the
            // profile. It is optional, so a
            // failure is only a warning.
            // ==================================

            try {

                await runDeleteStep(
                    "Removing the legacy profile record",
                    "realtime",
                    function () {
                        return deleteUserRealtimeData(user);
                    }
                );

            }
            catch (rtdbError) {

                console.error(
                    "[SHOPIX delete] Realtime Database cleanup failed:",
                    rtdbError
                );

                warnings.push(
                    "the Realtime Database profile record"
                );

            }


            // ==================================
            // 5. DELETE LOCAL DATA
            // ==================================

            await runDeleteStep(
                "Clearing local data",
                "firestore",
                function () {
                    clearUserLocalData(user.uid);
                    return true;
                }
            );


            // ==================================
            // 6. DELETE THE AUTH ACCOUNT
            // ==================================

            setDeleteAccountMessage(
                "Deleting your account...",
                "info"
            );

            // The flags are set before deleting so the
            // login page still knows what happened,
            // even if the auth listener redirects first.

            sessionStorage.setItem(
                "loggedOut",
                "true"
            );

            sessionStorage.setItem(
                "accountDeleted",
                "true"
            );

            try {

                await runDeleteStep(
                    "Deleting your account",
                    "auth",
                    function () {
                        return deleteUser(user);
                    }
                );

            }
            catch (authError) {

                // Firebase asks for a fresh sign-in when
                // the session is too old.

                if (
                    authError.code ===
                    "auth/requires-recent-login"
                ) {

                    await runDeleteStep(
                        "Verifying your identity again",
                        "auth",
                        function () {
                            return reauthenticateUser(user);
                        }
                    );

                    await runDeleteStep(
                        "Deleting your account",
                        "auth",
                        function () {
                            return deleteUser(user);
                        }
                    );

                }
                else {
                    throw authError;
                }

            }

            deleted.auth = true;


            // ==================================
            // 7. SIGN OUT + REDIRECT
            // ==================================

            try {
                await signOut(auth);
            }
            catch (signOutError) {
                console.warn(
                    "Sign out error:",
                    signOutError
                );
            }

            setDeleteAccountMessage(
                warnings.length > 0
                ? "Account deleted, but " +
                  warnings.join(", ") +
                  " could not be removed."
                : "Account deleted successfully.",
                warnings.length > 0 ? "error" : "success"
            );

            accountDeletedSuccessfully = true;

            window.location.replace(
                "loginpg.html"
            );

            return;

        }
        catch (error) {

            console.error(
                "[SHOPIX delete] Account deletion stopped:",
                error
            );

            // The account was not deleted, so the
            // flag has to go.

            sessionStorage.removeItem(
                "accountDeleted"
            );

            setDeleteAccountMessage(
                getDeleteAccountErrorMessage(
                    error,
                    deleted,
                    warnings
                ),
                "error"
            );

        }
        finally {

            // The modal buttons always come back, so
            // the user can retry. When the account was
            // deleted the page is already leaving.

            stopDeleteAccountWatchdog();

            if (!accountDeletedSuccessfully) {

                deleteAccountBusy = false;

                setDeleteAccountBusy(false);

            }

        }

    }


    // ==========================================
    // DELETE ACCOUNT - ERROR MESSAGES
    // ==========================================

    function getDeleteAccountErrorMessage(error, deleted, warnings) {

        // --------------------------------
        // SPECIFIC AUTH ERRORS
        // --------------------------------

        if (
            error.code ===
            "auth/invalid-credential" ||
            error.code ===
            "auth/wrong-password" ||
            error.code ===
            "auth/invalid-login-credentials"
        ) {
            return "Incorrect password. Please try again.";
        }

        if (
            error.code ===
            "auth/requires-recent-login"
        ) {
            return "Your session has expired. Please sign out, sign in again and then try again.";
        }

        if (
            error.code ===
            "auth/popup-closed-by-user" ||
            error.code ===
            "auth/cancelled-popup-request"
        ) {
            return "Verification was cancelled. Your account was not deleted.";
        }

        if (
            error.code ===
            "auth/user-not-found"
        ) {
            return "This account no longer exists.";
        }


        // --------------------------------
        // FIRESTORE / STORAGE CLEANUP
        // --------------------------------

        if (
            error.name ===
            "AccountCleanupError"
        ) {

            const denied =
                error.code ===
                "permission-denied";

            let message = error.message;

            if (denied) {

                message +=
                    " Firebase returned permission-denied " +
                    "(Missing or insufficient permissions) because your " +
                    "security rules do not allow the signed-in user " +
                    "to delete it.";

                message +=
                    " Add this line to the matching rule in " +
                    "Firestore Rules and try again: " +
                    "allow delete: if request.auth.uid == userId;";

            }
            else if (error.code) {

                message +=
                    " (" + error.code + ")";

            }

            if (deleted.firestore) {

                message =
                    "Your receipts, warranties and profile were " +
                    "deleted, but " +
                    message.charAt(0).toLowerCase() +
                    message.slice(1);

            }

            message +=
                " Your account has NOT been deleted, so you can " +
                "still sign in and try again.";

            if (warnings.length > 0) {
                message +=
                    " Note: " +
                    warnings.join(", ") +
                    " could not be removed either.";
            }

            return message;

        }


        // --------------------------------
        // PARTIAL DELETION
        // --------------------------------

        const removed = [];

        if (deleted.firestore) {
            removed.push("your receipts, warranties and profile");
        }

        if (deleted.storage) {
            removed.push("your avatar");
        }

        const detail =
            error.message ||
            "An unexpected error occurred.";

        let message = "";

        if (removed.length > 0) {

            message =
                "Deleted " +
                removed.join(" and ") +
                ", but your account could not be removed. " +
                detail;

        }
        else {

            message =
                "Your account was not deleted. " +
                detail;

        }

        if (warnings.length > 0) {
            message +=
                " Note: " +
                warnings.join(", ") +
                " could not be removed.";
        }

        return message;

    }


    // ==========================================
    // DELETE ACCOUNT - EVENTS
    // ==========================================

    if (deleteAccountButton) {

        deleteAccountButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                openDeleteAccountModal();

            }
        );

    }

    if (deleteAccountCancel) {

        deleteAccountCancel.addEventListener(
            "click",
            function () {
                closeDeleteAccountModal();
            }
        );

    }

    if (deleteAccountConfirm) {

        deleteAccountConfirm.addEventListener(
            "click",
            function () {

                // Guard against a second request while
                // the first one is still running.

                if (deleteAccountBusy) {
                    return;
                }

                performAccountDeletion();

            }
        );

    }

    if (deleteAccountPassword) {

        deleteAccountPassword.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Enter") {

                    event.preventDefault();

                    if (deleteAccountBusy) {
                        return;
                    }

                    performAccountDeletion();

                }

            }
        );

    }

    if (deleteAccountModal) {

        // Clicking the backdrop closes the dialog.

        deleteAccountModal.addEventListener(
            "click",
            function (event) {

                if (event.target === deleteAccountModal) {
                    closeDeleteAccountModal();
                }

            }
        );

    }

    document.addEventListener(
        "keydown",
        function (event) {

            if (event.key !== "Escape") {
                return;
            }

            if (
                deleteAccountModal &&
                deleteAccountModal.style.display === "flex"
            ) {
                closeDeleteAccountModal();
            }

        }
    );
}
