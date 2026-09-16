// ==========================================
// SHOPIX - WARRANTY MODULE
// STEP 5: SAVE WARRANTY TO FIRESTORE
// ==========================================

import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


// ==========================================
// GET FORM ELEMENTS
// ==========================================

const warrantyForm = document.getElementById("warrantyForm");
const productName = document.getElementById("productName");
const storeName = document.getElementById("storeName");
const purchaseDate = document.getElementById("purchaseDate");
const warrantyDuration = document.getElementById("warrantyDuration");
const expiryDate = document.getElementById("expiryDate");
const warrantyStatus = document.getElementById("warrantyStatus");
const cancelWarrantyBtn = document.getElementById("cancelWarrantyBtn");


// Store current logged-in user
let currentUser = null;


// ==========================================
// CALCULATE EXPIRY DATE
// ==========================================

function calculateExpiryDate() {

    if (!purchaseDate.value || !warrantyDuration.value) {
        expiryDate.value = "";
        warrantyStatus.value = "";
        return;
    }

    const date = new Date(purchaseDate.value);
    const months = parseInt(warrantyDuration.value);

    if (isNaN(months) || months <= 0) {
        expiryDate.value = "";
        warrantyStatus.value = "";
        return;
    }

    date.setMonth(date.getMonth() + months);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    expiryDate.value = `${year}-${month}-${day}`;

    calculateStatus(date);
}


// ==========================================
// CALCULATE WARRANTY STATUS
// ==========================================

function calculateStatus(expiry) {

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiryDay = new Date(expiry);
    expiryDay.setHours(0, 0, 0, 0);

    const difference = expiryDay - today;

    const daysRemaining = Math.ceil(
        difference / (1000 * 60 * 60 * 24)
    );

    if (daysRemaining < 0) {

        warrantyStatus.value = "Expired";

    } else if (daysRemaining <= 30) {

        warrantyStatus.value = "Expiring Soon";

    } else {

        warrantyStatus.value = "Active";

    }
}


// ==========================================
// UPDATE WHEN USER ENTERS DATA
// ==========================================

purchaseDate.addEventListener("change", calculateExpiryDate);

warrantyDuration.addEventListener("input", calculateExpiryDate);


// ==========================================
// CANCEL BUTTON
// ==========================================

cancelWarrantyBtn.addEventListener("click", () => {

    warrantyForm.reset();

    expiryDate.value = "";
    warrantyStatus.value = "";

});


// ==========================================
// SAVE WARRANTY TO FIRESTORE
// ==========================================

warrantyForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    // Check login
    if (!currentUser) {
        alert("Please log in to save warranty details.");
        return;
    }

    // Check calculated values
    if (!expiryDate.value || !warrantyStatus.value) {
        alert("Please enter purchase date and warranty duration.");
        return;
    }

    try {

        const warrantiesRef = collection(
            db,
            "users",
            currentUser.uid,
            "warranties"
        );

        await addDoc(warrantiesRef, {

            productName: productName.value.trim(),

            storeName: storeName.value.trim(),

            purchaseDate: purchaseDate.value,

            warrantyDurationMonths: parseInt(
                warrantyDuration.value
            ),

            warrantyExpiryDate: expiryDate.value,

            status: warrantyStatus.value,

            createdAt: serverTimestamp()

        });

        alert("Warranty saved successfully!");

        warrantyForm.reset();

        expiryDate.value = "";
        warrantyStatus.value = "";

    } catch (error) {

        console.error("Error saving warranty:", error);

        alert("Unable to save warranty. Please try again.");

    }

});


// ==========================================
// FIREBASE LOGIN CHECK
// ==========================================

onAuthStateChanged(auth, (user) => {

    if (user) {

        currentUser = user;

        console.log("Logged-in User UID:", user.uid);

    } else {

        currentUser = null;

        console.log("No user is currently logged in.");

    }

});