import { auth, db, storage } from "./firebase.js";

import {
    onAuthStateChanged,
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


// ===============================
// ELEMENTS
// ===============================

const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");

const saveProfileBtn = document.getElementById("saveProfileBtn");
const changePasswordBtn = document.getElementById("changePasswordBtn");

const settingsAvatar = document.getElementById("settingsAvatar");
const changeAvatarBtn = document.getElementById("changeAvatarBtn");
const removeAvatarBtn = document.getElementById("removeAvatarBtn");
const avatarInput = document.getElementById("avatarInput");
const avatarMessage = document.getElementById("avatarMessage");

let selectedAvatarFile = null;
let avatarRemoved = false;


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

    } catch (error) {

        console.error("Error loading user data:", error);

    }

});


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