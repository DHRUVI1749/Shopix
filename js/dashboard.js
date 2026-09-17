// ==========================================
// SHOPIX - DASHBOARD
// Recent Receipts
// ==========================================

import { auth, db } from "./firebase.js";

import {
    collection,
    query,
    orderBy,
    limit,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";


// =========================
// HTML ELEMENT
// =========================

const receiptList =
    document.getElementById("dashboardReceiptList");

const logoutButton =
    document.querySelector(".logout-btn");


// =========================
// LOAD RECENT RECEIPTS
// =========================

async function loadRecentReceipts(user) {

    if (!receiptList) {
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
            orderBy("createdAt", "desc"),
            limit(3)
        );


        const snapshot =
            await getDocs(receiptsQuery);


        // Clear loading message
        receiptList.innerHTML = "";


        // =========================
        // NO RECEIPTS
        // =========================

        if (snapshot.empty) {

            const emptyRow =
                document.createElement("div");

            emptyRow.className =
                "receipt-row";

            emptyRow.innerHTML = `
                <div class="receipt-store-icon">
                    🧾
                </div>

                <div class="receipt-info">

                    <strong>
                        No receipts yet
                    </strong>

                    <span>
                        Upload your first receipt
                    </span>

                </div>

                <div class="receipt-price">
                    —
                </div>
            `;

            receiptList.appendChild(emptyRow);

            return;
        }


        // =========================
        // DISPLAY RECEIPTS
        // =========================

        snapshot.forEach((docSnapshot) => {

            const receipt =
                docSnapshot.data();


            // Receipt row
            const row =
                document.createElement("div");

            row.className =
                "receipt-row";


            // Store icon
            const icon =
                document.createElement("div");

            icon.className =
                "receipt-store-icon";

            icon.textContent =
                "▣";


            // Information
            const info =
                document.createElement("div");

            info.className =
                "receipt-info";


            // Store name
            const store =
                document.createElement("strong");

            store.textContent =
                receipt.storeName ||
                "Unknown Store";


            // Category + date
            const meta =
                document.createElement("span");

            meta.textContent =
                `${receipt.category || "Other"} · ${receipt.purchaseDate || "No date"}`;


            info.appendChild(store);
            info.appendChild(meta);


            // Amount
            const price =
                document.createElement("div");

            price.className =
                "receipt-price";

            price.textContent =
                "₹" + (receipt.totalAmount || 0);


            // Add elements
            row.appendChild(icon);
            row.appendChild(info);
            row.appendChild(price);


            // =========================
            // OPEN RECEIPT DETAILS
            // =========================

            row.style.cursor = "pointer";

            row.addEventListener(
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


            receiptList.appendChild(row);

        });


    } catch (error) {

        console.error(
            "❌ Error loading dashboard receipts:",
            error
        );


        receiptList.innerHTML = `
            <div class="receipt-row">

                <div class="receipt-store-icon">
                    !
                </div>

                <div class="receipt-info">

                    <strong>
                        Unable to load receipts
                    </strong>

                    <span>
                        Please try again later
                    </span>

                </div>

            </div>
        `;
    }
}


// =========================
// LOGOUT
// =========================

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async function (event) {

            event.preventDefault();

            try {

                await signOut(auth);

                console.log(
                    "✅ User logged out successfully."
                );

                window.location.href =
                    "loginpg.html";

            } catch (error) {

                console.error(
                    "❌ Logout error:",
                    error
                );

            }

        }
    );

}


// =========================
// AUTH STATE
// =========================

onAuthStateChanged(
    auth,
    function (user) {

        if (user) {

            console.log(
                "✅ Dashboard user:",
                user.uid
            );

            loadRecentReceipts(user);

        } else {

            console.log(
                "ℹ️ No user logged in."
            );


            if (receiptList) {

                receiptList.innerHTML = `
                    <div class="receipt-row">

                        <div class="receipt-store-icon">
                            !
                        </div>

                        <div class="receipt-info">

                            <strong>
                                Please login
                            </strong>

                            <span>
                                Login to view your receipts
                            </span>

                        </div>

                    </div>
                `;
            }

        }

    }
);