// ==========================================
// SHOPIX - WARRANTY MODULE
// STEP 3: READ RECEIPT DATA
// ==========================================

import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


onAuthStateChanged(auth, async (user) => {

    if (!user) {
        console.log("No user is currently logged in.");
        return;
    }

    console.log("Logged-in User UID:", user.uid);

    try {

        // Read receipts from:
        // users/{uid}/receipts

        const receiptsRef = collection(
            db,
            "users",
            user.uid,
            "receipts"
        );

        const snapshot = await getDocs(receiptsRef);

        console.log("Total receipts found:", snapshot.size);

        snapshot.forEach((doc) => {

            console.log("Receipt ID:", doc.id);
            console.log("Receipt Data:", doc.data());

        });

    } catch (error) {

        console.error("Error reading receipts:", error);

    }

});