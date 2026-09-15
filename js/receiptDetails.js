// ==========================================
// SHOPIX - RECEIPT DETAILS
// ==========================================

import { auth, db } from "./firebase.js";

import {
    doc,
    getDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// =========================
// HTML ELEMENTS
// =========================

const loadingMessage = document.getElementById("loadingMessage");
const receiptDetails = document.getElementById("receiptDetails");
const errorMessage = document.getElementById("errorMessage");

const receiptImage = document.getElementById("receiptImage");
const storeName = document.getElementById("storeName");
const purchaseDate = document.getElementById("purchaseDate");
const totalAmount = document.getElementById("totalAmount");
const category = document.getElementById("category");
const itemsList = document.getElementById("itemsList");
const deleteReceiptBtn = document.getElementById("deleteReceiptBtn");


// =========================
//  Delete Receipt
// =========================
deleteReceiptBtn.addEventListener("click", async function () {

    const user = auth.currentUser;
    const receiptId =
        localStorage.getItem("selectedReceiptId");

    if (!user) {
        alert("Please login first.");
        return;
    }

    if (!receiptId) {
        alert("No receipt selected.");
        return;
    }

    const confirmDelete = confirm(
        "Are you sure you want to delete this receipt?"
    );

    if (!confirmDelete) {
        return;
    }

    deleteReceiptBtn.disabled = true;
    deleteReceiptBtn.textContent = "Deleting...";

    try {

        const receiptRef = doc(
            db,
            "users",
            user.uid,
            "receipts",
            receiptId
        );

        await deleteDoc(receiptRef);

        localStorage.removeItem("selectedReceiptId");

        alert("✅ Receipt deleted successfully!");

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

        deleteReceiptBtn.disabled = false;
        deleteReceiptBtn.textContent =
            "Delete Receipt";
    }
});

// =========================
// LOAD RECEIPT
// =========================

async function loadReceipt() {

    const user = auth.currentUser;

    // Check login
    if (!user) {
        loadingMessage.style.display = "none";
        errorMessage.textContent =
            "Please login to view this receipt.";
        errorMessage.style.display = "block";
        return;
    }


    // Get selected receipt ID
    const receiptId =
        localStorage.getItem("selectedReceiptId");

    if (!receiptId) {
        loadingMessage.style.display = "none";
        errorMessage.textContent =
            "No receipt selected.";
        errorMessage.style.display = "block";
        return;
    }


    try {

        // Receipt document reference
        const receiptRef = doc(
            db,
            "users",
            user.uid,
            "receipts",
            receiptId
        );


        // Get receipt from Firestore
        const receiptSnapshot =
            await getDoc(receiptRef);


        if (!receiptSnapshot.exists()) {

            loadingMessage.style.display = "none";

            errorMessage.textContent =
                "Receipt not found.";

            errorMessage.style.display = "block";

            return;
        }


        // Receipt data
        const receipt =
            receiptSnapshot.data();


        // =========================
        // DISPLAY BASIC INFORMATION
        // =========================

        storeName.textContent =
            receipt.storeName || "Unknown Store";

        purchaseDate.textContent =
            receipt.purchaseDate || "No date";

        totalAmount.textContent =
            "₹" + (receipt.totalAmount || 0);

        category.textContent =
            receipt.category || "Other";


        // =========================
        // DISPLAY RECEIPT IMAGE
        // =========================

        if (receipt.imageUrl) {

            receiptImage.src =
                receipt.imageUrl;

            receiptImage.style.display =
                "block";

        } else {

            receiptImage.style.display =
                "none";
        }


        // =========================
        // DISPLAY ITEMS
        // =========================

        itemsList.innerHTML = "";

        const items =
            receipt.items || [];


        if (items.length === 0) {

            itemsList.textContent =
                "No items found.";

        } else {

            items.forEach((item) => {

                const itemRow =
                    document.createElement("div");

                itemRow.className =
                    "item-row";


                const itemName =
                    document.createElement("span");

                itemName.className =
                    "item-name";


                const itemPrice =
                    document.createElement("span");

                itemPrice.className =
                    "item-price";


                // Support object or simple text
                if (typeof item === "object") {

                    itemName.textContent =
                        item.name || "Unknown Item";

                    itemPrice.textContent =
                        "₹" + (item.price || 0);

                } else {

                    itemName.textContent =
                        item;

                    itemPrice.textContent =
                        "";
                }


                itemRow.appendChild(itemName);
                itemRow.appendChild(itemPrice);

                itemsList.appendChild(itemRow);

            });
        }


        // =========================
        // SHOW DETAILS
        // =========================

        loadingMessage.style.display =
            "none";

        receiptDetails.style.display =
            "block";


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


// =========================
// START
// =========================

loadReceipt();