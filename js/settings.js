import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


// ===============================
// ELEMENTS
// ===============================

const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");

const saveProfileBtn = document.getElementById("saveProfileBtn");
const themeToggle = document.getElementById("themeToggle");
const changePasswordBtn = document.getElementById("changePasswordBtn");


// ===============================
// THEME
// ===============================

function applyTheme(theme) {

    if (theme === "dark") {
        document.body.classList.add("dark-theme");
    } else {
        document.body.classList.remove("dark-theme");
    }
}


// Load saved theme
const savedTheme = localStorage.getItem("shopixTheme") || "light";

applyTheme(savedTheme);


// Theme toggle
themeToggle.addEventListener("click", () => {

    const isDark = document.body.classList.contains("dark-theme");

    const newTheme = isDark ? "light" : "dark";

    applyTheme(newTheme);

    localStorage.setItem("shopixTheme", newTheme);

});


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

        if (userSnap.exists()) {

            const userData = userSnap.data();

            userName.value = userData.name || "";

        }

    } catch (error) {

        console.error("Error loading user data:", error);

    }

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

        alert("Profile updated successfully.");

    } catch (error) {

        console.error("Error saving profile:", error);

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