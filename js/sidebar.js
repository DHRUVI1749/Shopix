// ==========================================
// SHOPIX - GLOBAL SIDEBAR
//
// Every page of the app uses the same sidebar.
// This module owns the behaviour that belongs to
// it:
//
//   - the off canvas drawer on phones and tablets
//   - the Logout button
//   - the Delete Account button (js/delete-account.js)
//
// The script is safe on every page: it does
// nothing when the page has no sidebar or no
// menu button.
// ==========================================

import {
    auth
} from "./firebase.js";

import {
    signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    initDeleteAccount
} from "./delete-account.js";


/* ==========================================
   MOBILE DRAWER
   ========================================== */

function setupDrawer() {

    const sidebarElement =
        document.querySelector(".sidebar");

    const mobileMenuButton =
        document.querySelector(".mobile-menu-btn");

    if (!sidebarElement || !mobileMenuButton) {
        return;
    }

    // The overlay is created here so that no
    // page markup has to change.

    let sidebarOverlay =
        document.querySelector(".sidebar-overlay");

    if (!sidebarOverlay) {

        sidebarOverlay =
            document.createElement("div");

        sidebarOverlay.className =
            "sidebar-overlay";

        document.body.appendChild(
            sidebarOverlay
        );

    }

    mobileMenuButton.setAttribute(
        "aria-expanded",
        "false"
    );

    mobileMenuButton.setAttribute(
        "aria-label",
        "Open navigation menu"
    );

    function openSidebar() {

        sidebarElement.classList.add(
            "sidebar-open"
        );

        sidebarOverlay.classList.add(
            "sidebar-overlay-visible"
        );

        document.body.classList.add(
            "sidebar-locked"
        );

        mobileMenuButton.setAttribute(
            "aria-expanded",
            "true"
        );

    }

    function closeSidebar() {

        sidebarElement.classList.remove(
            "sidebar-open"
        );

        sidebarOverlay.classList.remove(
            "sidebar-overlay-visible"
        );

        document.body.classList.remove(
            "sidebar-locked"
        );

        mobileMenuButton.setAttribute(
            "aria-expanded",
            "false"
        );

    }

    function toggleSidebar() {

        if (sidebarElement.classList.contains(
            "sidebar-open"
        )) {
            closeSidebar();
            return;
        }

        openSidebar();

    }


    // MENU BUTTON

    mobileMenuButton.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            toggleSidebar();

        }
    );


    // CLICKING THE DIMMED BACKGROUND
    // CLOSES THE DRAWER

    sidebarOverlay.addEventListener(
        "click",
        closeSidebar
    );


    // FOLLOWING A LINK CLOSES THE DRAWER

    sidebarElement.addEventListener(
        "click",
        function (event) {

            if (event.target.closest(".nav-item")) {
                closeSidebar();
            }

        }
    );


    // ESCAPE CLOSES THE DRAWER

    document.addEventListener(
        "keydown",
        function (event) {

            if (event.key === "Escape") {
                closeSidebar();
            }

        }
    );


    // GOING BACK TO THE WIDE LAYOUT
    // CLOSES THE DRAWER

    window.addEventListener(
        "resize",
        function () {

            if (window.innerWidth > 650) {
                closeSidebar();
            }

        }
    );

}


/* ==========================================
   LOGOUT
   ========================================== */

function setupLogout() {

    const logoutButton =
        document.querySelector(".logout-btn");

    if (!logoutButton) {
        return;
    }

    logoutButton.addEventListener(
        "click",
        async function (event) {

            event.preventDefault();

            const user = auth.currentUser;

            if (!user) {
                window.location.replace("loginpg.html");
                return;
            }

            try {

                logoutButton.disabled = true;

                // Flag the logout so the login page
                // knows the user signed out.

                sessionStorage.setItem(
                    "loggedOut",
                    "true"
                );

                await signOut(auth);

                window.location.replace(
                    "loginpg.html"
                );

            }
            catch (error) {

                console.error(
                    "Logout error:",
                    error
                );

                logoutButton.disabled = false;

                alert(
                    "Unable to log out. Please try again."
                );

            }

        }
    );

}


/* ==========================================
   START
   ========================================== */

function setupSidebar() {

    setupDrawer();

    setupLogout();

    initDeleteAccount();

}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        setupSidebar
    );
} else {
    setupSidebar();
}
