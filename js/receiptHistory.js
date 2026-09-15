// ==========================================
// SHOPIX - RECEIPT HISTORY
// ==========================================

import { auth, db } from "./firebase.js";

import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const receiptList = document.getElementById("receiptList");
const loadingMessage = document.getElementById("loadingMessage");
const emptyMessage = document.getElementById("emptyMessage");


// ==========================================
// LOAD RECEIPTS
// ==========================================

async function loadReceipts() {

    const user = auth.currentUser;

    if (!user) {
        loadingMessage.textContent =
            "Please login to view your receipts.";
        return;
    }

    try {

        const receiptsRef = collection(
            db,
            "users",
            user.uid,
            "receipts"
        );

        const receiptsQuery = query(
            receiptsRef,
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(receiptsQuery);

        loadingMessage.style.display = "none";

        if (snapshot.empty) {

            emptyMessage.style.display = "block";
            return;
        }

        snapshot.forEach((docSnapshot) => {

            const receipt = docSnapshot.data();

            const card = document.createElement("div");
            card.className = "receipt-card";

            const info = document.createElement("div");
            info.className = "receipt-info";

            const store = document.createElement("div");
            store.className = "receipt-store";
            store.textContent =
                receipt.storeName || "Unknown Store";

            const meta = document.createElement("div");
            meta.className = "receipt-meta";

            const date = document.createElement("span");
            date.textContent =
                receipt.purchaseDate || "No date";

            const category = document.createElement("span");
            category.textContent =
                receipt.category || "Other";

            meta.appendChild(date);
            meta.appendChild(category);

            const amount = document.createElement("div");
            amount.className = "receipt-amount";
            amount.textContent =
                "₹" + (receipt.totalAmount || 0);

            info.appendChild(store);
            info.appendChild(meta);
            info.appendChild(amount);

            const viewButton = document.createElement("button");
            viewButton.className = "view-btn";
            viewButton.textContent = "View Details";

            viewButton.addEventListener("click", function () {

                localStorage.setItem(
                    "selectedReceiptId",
                    docSnapshot.id
                );

                window.location.href =
                    "receiptDetails.html";
            });

            card.appendChild(info);
            card.appendChild(viewButton);

            receiptList.appendChild(card);
        });

    } catch (error) {

        console.error(
            "❌ Error loading receipts:",
            error
        );

        loadingMessage.textContent =
            "Unable to load receipts. Please try again.";
    }
}


// ==========================================
// START
// ==========================================

loadReceipts();