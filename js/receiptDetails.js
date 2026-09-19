// ==========================================
// SHOPIX - RECEIPT DETAILS
// ==========================================

import { auth, db } from "./firebase.js";

import {
    doc,
    getDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";


// ==========================================
// HTML ELEMENTS
// ==========================================

const loadingMessage =
    document.getElementById("loadingMessage");

const receiptDetails =
    document.getElementById("receiptDetails");

const errorMessage =
    document.getElementById("errorMessage");

const receiptImage =
    document.getElementById("receiptImage");

const storeName =
    document.getElementById("storeName");

const purchaseDate =
    document.getElementById("purchaseDate");

const totalAmount =
    document.getElementById("totalAmount");

const category =
    document.getElementById("category");

const itemsList =
    document.getElementById("itemsList");

const deleteReceiptBtn =
    document.getElementById("deleteReceiptBtn");


// ==========================================
// LOAD RECEIPT
// ==========================================

async function loadReceipt(user) {

    console.log(
        "Loading receipt for user:",
        user.uid
    );


    // ==========================================
    // GET SELECTED RECEIPT ID
    // ==========================================

    const receiptId =
        localStorage.getItem(
            "selectedReceiptId"
        );


    if (!receiptId) {

        loadingMessage.style.display =
            "none";

        errorMessage.textContent =
            "No receipt selected.";

        errorMessage.style.display =
            "block";

        return;
    }


    try {

        // ==========================================
        // RECEIPT DOCUMENT
        // ==========================================

        const receiptRef =
            doc(
                db,
                "users",
                user.uid,
                "receipts",
                receiptId
            );


        // ==========================================
        // GET RECEIPT
        // ==========================================

        const receiptSnapshot =
            await getDoc(receiptRef);


        if (!receiptSnapshot.exists()) {

            loadingMessage.style.display =
                "none";

            errorMessage.textContent =
                "Receipt not found.";

            errorMessage.style.display =
                "block";

            return;
        }


        const receipt =
            receiptSnapshot.data();


        console.log(
            "Receipt loaded:",
            receipt
        );


        // ==========================================
        // STORE NAME
        // ==========================================

        storeName.textContent =
            receipt.storeName ||
            "Unknown Store";


        // ==========================================
        // PURCHASE DATE
        // ==========================================

        purchaseDate.textContent =
            receipt.purchaseDate ||
            "No date";


        // ==========================================
        // TOTAL AMOUNT
        // ==========================================

        totalAmount.textContent =
            "₹" +
            (receipt.totalAmount || 0);


        // ==========================================
        // CATEGORY
        // ==========================================

        category.textContent =
            receipt.category ||
            "Other";


        // ==========================================
        // RECEIPT IMAGE
        // ==========================================

        // Storage is not being used.
        // Therefore there is no permanent image URL.

        receiptImage.style.display =
            "none";


        // ==========================================
        // PURCHASED ITEMS
        // ==========================================

        itemsList.innerHTML = "";

        const items =
            receipt.items || [];


        if (
            !Array.isArray(items) ||
            items.length === 0
        ) {

            itemsList.textContent =
                "No items found.";

        } else {

            items.forEach(
                function (item) {

                    const itemRow =
                        document.createElement(
                            "div"
                        );

                    itemRow.className =
                        "item-row";


                    const itemName =
                        document.createElement(
                            "span"
                        );

                    itemName.className =
                        "item-name";


                    const itemPrice =
                        document.createElement(
                            "span"
                        );

                    itemPrice.className =
                        "item-price";


                    if (
                        typeof item ===
                        "object"
                    ) {

                        itemName.textContent =
                            item.name ||
                            "Unknown Item";


                        const quantity =
                            item.quantity ||
                            1;


                        const price =
                            item.price ||
                            0;


                        itemPrice.textContent =
                            "Qty: " +
                            quantity +
                            " • ₹" +
                            price;

                    } else {

                        itemName.textContent =
                            item;

                        itemPrice.textContent =
                            "";

                    }


                    itemRow.appendChild(
                        itemName
                    );

                    itemRow.appendChild(
                        itemPrice
                    );

                    itemsList.appendChild(
                        itemRow
                    );

                }
            );

        }


        // ==========================================
        // SHOW DETAILS
        // ==========================================

        loadingMessage.style.display =
            "none";

        errorMessage.style.display =
            "none";

        receiptDetails.style.display =
            "block";


        console.log(
            "✅ Receipt details displayed successfully."
        );


    } catch (error) {

        console.error(
            "❌ Error loading receipt:",
            error
        );


        loadingMessage.style.display =
            "none";

        errorMessage.textContent =
            "Unable to load receipt. Please try again.";

        errorMessage.style.display =
            "block";

    }

}


// ==========================================
// DELETE RECEIPT
// ==========================================

deleteReceiptBtn.addEventListener(
    "click",
    async function () {

        const user =
            auth.currentUser;

        const receiptId =
            localStorage.getItem(
                "selectedReceiptId"
            );


        if (!user) {

            alert(
                "Please login first."
            );

            return;
        }


        if (!receiptId) {

            alert(
                "No receipt selected."
            );

            return;
        }


        const confirmDelete =
            confirm(
                "Are you sure you want to delete this receipt?"
            );


        if (!confirmDelete) {

            return;
        }


        deleteReceiptBtn.disabled =
            true;

        deleteReceiptBtn.textContent =
            "Deleting...";


        try {

            const receiptRef =
                doc(
                    db,
                    "users",
                    user.uid,
                    "receipts",
                    receiptId
                );


            await deleteDoc(
                receiptRef
            );


            localStorage.removeItem(
                "selectedReceiptId"
            );


            alert(
                "✅ Receipt deleted successfully!"
            );


            window.location.href =
                "receiptHistory.html";


        } catch (error) {

            console.error(
                "❌ Error deleting receipt:",
                error
            );


            alert(
                "Unable to delete receipt. Please try again."
            );


            deleteReceiptBtn.disabled =
                false;

            deleteReceiptBtn.textContent =
                "Delete Receipt";

        }

    }
);


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

            loadReceipt(user);

        } else {

            loadingMessage.style.display =
                "none";

            errorMessage.textContent =
                "Please login to view this receipt.";

            errorMessage.style.display =
                "block";

        }

    }
);