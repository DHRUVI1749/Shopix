// ==========================================
// SHOPIX - RECEIPT HISTORY
// ==========================================

import { auth, db } from "./firebase.js";

import {
    collection,
    getDocs,
    query
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";


// ==========================================
// HTML ELEMENTS
// ==========================================

const receiptList =
    document.getElementById(
        "receiptList"
    );

const loadingMessage =
    document.getElementById(
        "loadingMessage"
    );

const emptyMessage =
    document.getElementById(
        "emptyMessage"
    );


// ==========================================
// FORMAT CURRENCY
// ==========================================

function formatCurrency(
    amount,
    currency = "INR"
) {

    const numericAmount =
        Number(amount) || 0;


    try {

        return new Intl.NumberFormat(
            "en-IN",
            {
                style:
                    "currency",

                currency:
                    currency
            }
        ).format(
            numericAmount
        );

    } catch (error) {

        return (
            currency +
            " " +
            numericAmount
        );

    }

}


// ==========================================
// NORMALIZE CURRENCY
// ==========================================

function normalizeCurrency(currency) {

    if (!currency) {
        return "INR";
    }


    const value =
        String(currency)
            .trim()
            .toUpperCase();


    if (
        value === "₹" ||
        value === "RS" ||
        value === "RS." ||
        value === "INR"
    ) {

        return "INR";

    }


    if (
        value === "$" ||
        value === "US$" ||
        value === "USD"
    ) {

        return "USD";

    }


    if (
        value === "€" ||
        value === "EUR"
    ) {

        return "EUR";

    }


    if (
        value === "£" ||
        value === "GBP"
    ) {

        return "GBP";

    }


    if (
        value === "AED" ||
        value === "د.إ"
    ) {

        return "AED";

    }


    if (
        value === "AUD"
    ) {

        return "AUD";

    }


    if (
        value === "CAD"
    ) {

        return "CAD";

    }


    if (
        value === "JPY" ||
        value === "¥"
    ) {

        return "JPY";

    }


    return value;

}


// ==========================================
// LOAD RECEIPTS
// ==========================================

async function loadReceipts(user) {

    try {

        console.log(
            "Loading receipts for user:",
            user.uid
        );


        const receiptsRef =
            collection(
                db,
                "users",
                user.uid,
                "receipts"
            );


        // Get all receipts
        const receiptsQuery =
            query(
                receiptsRef
            );


        const snapshot =
            await getDocs(
                receiptsQuery
            );


        console.log(
            "Receipts found:",
            snapshot.size
        );


        // Hide loading
        loadingMessage.style.display =
            "none";


        // ==================================
        // NO RECEIPTS
        // ==================================

        if (snapshot.empty) {

            emptyMessage.style.display =
                "block";

            return;

        }


        // Hide empty message
        emptyMessage.style.display =
            "none";


        // Clear old list
        receiptList.innerHTML =
            "";


        // ==================================
        // DISPLAY RECEIPTS
        // ==================================

        snapshot.forEach(
            (docSnapshot) => {

                const receipt =
                    docSnapshot.data();


                // ==================================
                // RECEIPT CARD
                // ==================================

                const card =
                    document.createElement(
                        "div"
                    );

                card.className =
                    "receipt-card";


                // ==================================
                // INFO SECTION
                // ==================================

                const info =
                    document.createElement(
                        "div"
                    );

                info.className =
                    "receipt-info";


                // ==================================
                // STORE NAME
                // ==================================

                const store =
                    document.createElement(
                        "div"
                    );

                store.className =
                    "receipt-store";

                store.textContent =
                    receipt.storeName ||
                    "Unknown Store";


                // ==================================
                // META
                // ==================================

                const meta =
                    document.createElement(
                        "div"
                    );

                meta.className =
                    "receipt-meta";


                // Date
                const date =
                    document.createElement(
                        "span"
                    );

                date.textContent =
                    receipt.purchaseDate ||
                    "No date";


                // Category
                const category =
                    document.createElement(
                        "span"
                    );

                category.textContent =
                    receipt.category ||
                    "Other";


                meta.appendChild(
                    date
                );

                meta.appendChild(
                    category
                );


                // ==================================
                // AMOUNT
                // ==================================

                const amount =
                    document.createElement(
                        "div"
                    );

                amount.className =
                    "receipt-amount";


                const currency =
                    normalizeCurrency(
                        receipt.currency
                    );


                amount.textContent =
                    formatCurrency(
                        receipt.totalAmount || 0,
                        currency
                    );


                // ==================================
                // ADD INFORMATION
                // ==================================

                info.appendChild(
                    store
                );

                info.appendChild(
                    meta
                );

                info.appendChild(
                    amount
                );


                // ==================================
                // VIEW DETAILS BUTTON
                // ==================================

                const viewButton =
                    document.createElement(
                        "button"
                    );

                viewButton.className =
                    "view-btn";

                viewButton.textContent =
                    "View Details";


                viewButton.addEventListener(
                    "click",
                    function () {

                        localStorage.setItem(
                            "selectedReceiptId",
                            docSnapshot.id
                        );


                        window.location.href =
                            "receiptDetails.html";

                    }
                );


                // ==================================
                // ADD CARD TO PAGE
                // ==================================

                card.appendChild(
                    info
                );

                card.appendChild(
                    viewButton
                );

                receiptList.appendChild(
                    card
                );

            }
        );


    } catch (error) {

        console.error(
            "❌ Error loading receipts:",
            error
        );


        loadingMessage.style.display =
            "block";


        loadingMessage.textContent =
            "Unable to load receipts. Please try again.";

    }

}


// ==========================================
// WAIT FOR FIREBASE AUTH
// ==========================================

onAuthStateChanged(
    auth,
    function (user) {

        console.log(
            "Auth state:",
            user
                ? "Logged in"
                : "Not logged in"
        );


        if (user) {

            loadReceipts(
                user
            );

        } else {

            loadingMessage.textContent =
                "Please login to view your receipts.";

        }

    }
);