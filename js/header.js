// ==========================================
// SHOPIX - COMMON PAGE HEADER
//
// Owns the behaviour shared by every signed-in
// page:
//
//   - the account link state in the common header
//   - the Logout buttons on Settings and the Dashboard sidebar
//   - the Delete Account flow (js/delete-account.js)
//
// The script is safe on pages that do not have
// these controls.
// ==========================================

import {
    auth
} from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    initDeleteAccount
} from "./delete-account.js";


/* ==========================================
   ACCOUNT LINK
   ========================================== */

function setupAccountLink() {

    const accountLink =
        document.querySelector(".account-link");

    if (!accountLink) {
        return;
    }

    const page =
        window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();

    if (page === "settings.html") {

        accountLink.setAttribute(
            "aria-current",
            "page"
        );

        accountLink.classList.add(
            "account-link-active"
        );

    }

}


/* ==========================================
   ACCOUNT AVATAR
   ========================================== */

function setupAccountAvatar() {

    const accountLinks =
        document.querySelectorAll(".account-link");

    if (!accountLinks.length) {
        return;
    }

    const defaultIcons = new Map();

    accountLinks.forEach(function (link) {

        defaultIcons.set(
            link,
            link.innerHTML
        );

    });

    onAuthStateChanged(auth, function (user) {

        accountLinks.forEach(function (link) {

            if (!user) {

                link.innerHTML =
                    defaultIcons.get(link);

                return;
            }

            if (user.photoURL) {

                const image =
                    document.createElement("img");

                image.src = user.photoURL;
                image.alt = "";
                image.className = "account-avatar";

                link.replaceChildren(image);

                return;
            }

            const initial =
                (
                    user.displayName ||
                    user.email ||
                    "U"
                )
                    .trim()
                    .charAt(0)
                    .toUpperCase();

            const badge =
                document.createElement("span");

            badge.className = "account-initial";
            badge.textContent = initial;

            link.replaceChildren(badge);

        });

    });

}


/* ==========================================
   DASHBOARD SIDEBAR
   ========================================== */

function setupDashboardSidebar() {

    if (!document.body.classList.contains("dashboard-page")) {
        return;
    }

    const sidebar =
        document.getElementById("dashboardSidebar");

    const openButton =
        document.getElementById("dashboardSidebarToggle");

    const closeButton =
        document.getElementById("dashboardSidebarClose");

    const backdrop =
        document.getElementById("dashboardSidebarBackdrop");

    if (!sidebar || !openButton) {
        return;
    }

    function openSidebar() {

        document.body.classList.add("sidebar-open");

        openButton.setAttribute(
            "aria-expanded",
            "true"
        );

        if (closeButton) {
            closeButton.focus();
        }

    }

    function closeSidebar() {

        document.body.classList.remove("sidebar-open");

        openButton.setAttribute(
            "aria-expanded",
            "false"
        );

    }

    openButton.addEventListener(
        "click",
        openSidebar
    );

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeSidebar
        );

    }

    if (backdrop) {

        backdrop.addEventListener(
            "click",
            closeSidebar
        );

    }

    sidebar.querySelectorAll("a").forEach(
        function (link) {

            link.addEventListener(
                "click",
                closeSidebar
            );

        }
    );

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape" &&
                document.body.classList.contains("sidebar-open")
            ) {
                closeSidebar();
                openButton.focus();
            }

        }
    );

    window.addEventListener(
        "resize",
        function () {

            if (window.innerWidth > 1024) {
                closeSidebar();
            }

        }
    );

}


/* ==========================================
   LOGOUT
   ========================================== */

function setupLogout() {

    const logoutButtons =
        document.querySelectorAll(".logout-btn");

    if (!logoutButtons.length) {
        return;
    }

    logoutButtons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                async function (event) {

                    event.preventDefault();

                    const user =
                        auth.currentUser;

                    if (!user) {

                        window.location.replace(
                            "loginpg.html"
                        );

                        return;
                    }

                    try {

                        button.disabled = true;

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

                        button.disabled = false;

                        alert(
                            "Unable to log out. Please try again."
                        );

                    }

                }
            );

        }
    );

}


/* ==========================================
   START
   ========================================== */

function setupHeader() {

    setupAccountLink();

    setupAccountAvatar();

    setupDashboardSidebar();

    setupLogout();

    initDeleteAccount();

}

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        setupHeader
    );

} else {

    setupHeader();

}
