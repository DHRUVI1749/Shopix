// ==========================================
// SHOPIX - WARRANTY MODULE
// ==========================================

import { auth, db } from "./firebase.js";


// ==========================================
// FIREBASE CONNECTION TEST
// ==========================================

auth.onAuthStateChanged((user) => {

    if (user) {

        console.log("Warranty module connected.");
        console.log("Logged-in User UID:", user.uid);

    } else {

        console.log("No user is currently logged in.");

    }

});