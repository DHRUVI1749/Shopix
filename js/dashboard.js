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


// ===============================
// RECENT RECEIPTS
// ===============================

const receiptList =
    document.getElementById("dashboardReceiptList");


// ===============================
// LOAD RECENT RECEIPTS
// ===============================

async function loadRecentReceipts(user) {

    if (!receiptList) return;

    receiptList.innerHTML =
        "<p>Loading recent receipts...</p>";

    try {

        const receiptsRef =
            collection(
                db,
                "users",
                user.uid,
                "receipts"
            );

        const receiptsQuery =
            query(
                receiptsRef,
                orderBy("createdAt", "desc"),
                limit(3)
            );

        const snapshot =
            await getDocs(receiptsQuery);


        if (snapshot.empty) {

            receiptList.innerHTML =
                "<p>No recent receipts found.</p>";

            return;
        }


        receiptList.innerHTML = "";


        snapshot.forEach((doc) => {

            const data = doc.data();

            const receiptItem =
                document.createElement("div");

            receiptItem.className =
                "receipt-item";


            receiptItem.innerHTML = `
                <div>
                    <h4>
                        ${data.storeName || "Unknown Store"}
                    </h4>

                    <p>
                        ${data.purchaseDate || ""}
                    </p>
                </div>

                <div>
                    ₹${data.totalAmount || 0}
                </div>
            `;


            receiptItem.addEventListener(
                "click",
                function () {

                    localStorage.setItem(
                        "selectedReceiptId",
                        doc.id
                    );

                    window.location.href =
                        "receiptDetails.html";
                }
            );


            receiptList.appendChild(
                receiptItem
            );

        });


    } catch (error) {

        console.error(
            "Error loading receipts:",
            error
        );

        receiptList.innerHTML =
            "<p>Unable to load recent receipts.</p>";
    }
}



// ===============================
// LOGOUT
// ===============================

const logoutButton =
    document.querySelector(".logout-btn");


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


                // Create logout message
                const logoutMessage =
                    document.createElement("div");


                logoutMessage.textContent =
                    "✅ You have been logged out successfully.";


                // Message position & design
                logoutMessage.style.position =
                    "fixed";

                logoutMessage.style.bottom =
                    "30px";

                logoutMessage.style.left =
                    "50%";

                logoutMessage.style.transform =
                    "translateX(-50%)";

                logoutMessage.style.padding =
                    "14px 22px";

                logoutMessage.style.background =
                    "#ffffff";

                logoutMessage.style.color =
                    "#142d6b";

                logoutMessage.style.borderRadius =
                    "10px";

                logoutMessage.style.boxShadow =
                    "0 4px 15px rgba(0,0,0,0.15)";

                logoutMessage.style.fontSize =
                    "15px";

                logoutMessage.style.fontWeight =
                    "600";

                logoutMessage.style.zIndex =
                    "9999";


                document.body.appendChild(
                    logoutMessage
                );


                // Wait 3 seconds
                setTimeout(() => {

                    logoutMessage.remove();

                    window.location.href =
                        "loginpg.html";

                }, 3000);


            } catch (error) {

                console.error(
                    "❌ Logout error:",
                    error
                );

            }

        }
    );

}



// ===============================
// AUTHENTICATION CHECK
// ===============================

onAuthStateChanged(
    auth,
    function (user) {

        if (user) {

            loadRecentReceipts(user);

        } else {

            if (receiptList) {

                receiptList.innerHTML =
                    "<p>Please login to view your receipts.</p>";
            }

        }

    }
);