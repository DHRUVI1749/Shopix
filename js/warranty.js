import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    collection,
    getDocs,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


/* =========================
   FORM ELEMENTS
========================= */

const warrantyForm =
    document.getElementById("warrantyForm");

const productName =
    document.getElementById("productName");

const storeName =
    document.getElementById("storeName");

const purchaseDate =
    document.getElementById("purchaseDate");

const warrantyDuration =
    document.getElementById("warrantyDuration");

const expiryDate =
    document.getElementById("expiryDate");

const warrantyStatus =
    document.getElementById("warrantyStatus");

const cancelWarrantyBtn =
    document.getElementById("cancelWarrantyBtn");


/* =========================
   RECEIPT ELEMENTS
========================= */

const receiptProductSelect =
    document.getElementById("receiptProductSelect");

const selectedReceiptInfo =
    document.getElementById("selectedReceiptInfo");

const selectedStoreName =
    document.getElementById("selectedStoreName");

const selectedPurchaseDate =
    document.getElementById("selectedPurchaseDate");


/* =========================
   DASHBOARD ELEMENTS
========================= */

const activeWarrantyCount =
    document.getElementById("activeWarrantyCount");

const expiringWarrantyCount =
    document.getElementById("expiringWarrantyCount");

const expiredWarrantyCount =
    document.getElementById("expiredWarrantyCount");

const totalWarrantyCount =
    document.getElementById("totalWarrantyCount");

const upcomingWarrantyBody =
    document.getElementById("upcomingWarrantyBody");

const upcomingWarrantyCount =
    document.getElementById("upcomingWarrantyCount");

const warrantyReminderText =
    document.getElementById("warrantyReminderText");

const warrantyHistoryBody =
    document.getElementById("warrantyHistoryBody");


/* =========================
   VARIABLES
========================= */

let currentUser = null;

let receiptProducts = [];

let selectedReceiptId = null;

let allWarranties = [];


/* =========================
   CALCULATE EXPIRY DATE
========================= */

function calculateExpiryDate() {

    if (
        !purchaseDate ||
        !warrantyDuration ||
        !expiryDate
    ) {
        return;
    }


    if (
        !purchaseDate.value ||
        !warrantyDuration.value
    ) {

        expiryDate.value = "";

        if (warrantyStatus) {
            warrantyStatus.value = "";
        }

        return;
    }


    const purchase =
        new Date(purchaseDate.value);

    const months =
        parseInt(
            warrantyDuration.value,
            10
        );


    if (
        Number.isNaN(months) ||
        months <= 0
    ) {

        expiryDate.value = "";

        if (warrantyStatus) {
            warrantyStatus.value = "";
        }

        return;
    }


    purchase.setMonth(
        purchase.getMonth() + months
    );


    const year =
        purchase.getFullYear();

    const month =
        String(
            purchase.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            purchase.getDate()
        ).padStart(2, "0");


    expiryDate.value =
        `${year}-${month}-${day}`;


    updateWarrantyStatus();
}


/* =========================
   GET WARRANTY STATUS
========================= */

function getWarrantyStatus(expiry) {

    if (!expiry) {
        return "Unknown";
    }


    const today = new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );


    const expiryDateObject =
        new Date(expiry);

    expiryDateObject.setHours(
        0,
        0,
        0,
        0
    );


    const difference =
        expiryDateObject.getTime() -
        today.getTime();


    const daysRemaining =
        Math.ceil(
            difference /
            (1000 * 60 * 60 * 24)
        );


    if (daysRemaining < 0) {
        return "Expired";
    }


    if (daysRemaining <= 30) {
        return "Expiring Soon";
    }


    return "Active";
}


/* =========================
   UPDATE FORM STATUS
========================= */

function updateWarrantyStatus() {

    if (
        !expiryDate ||
        !warrantyStatus
    ) {
        return;
    }


    if (!expiryDate.value) {

        warrantyStatus.value = "";

        return;
    }


    warrantyStatus.value =
        getWarrantyStatus(
            expiryDate.value
        );
}


/* =========================
   LOAD PRODUCTS FROM RECEIPTS
========================= */

async function loadReceiptProducts() {

    if (!currentUser || !receiptProductSelect) {
        return;
    }


    receiptProducts = [];

    receiptProductSelect.innerHTML =
        `<option value="">
            Select a product
        </option>`;


    try {

        const receiptsRef =
            collection(
                db,
                "users",
                currentUser.uid,
                "receipts"
            );


        const snapshot =
            await getDocs(
                receiptsRef
            );


        snapshot.forEach((doc) => {

            const receipt =
                doc.data();


            const items =
                Array.isArray(
                    receipt.items
                )
                    ? receipt.items
                    : [];


            items.forEach((item) => {

                let itemName = "";


                if (
                    typeof item === "string"
                ) {

                    itemName = item;

                } else if (
                    item &&
                    item.name
                ) {

                    itemName = item.name;

                }


                if (!itemName) {
                    return;
                }


                receiptProducts.push({

                    receiptId: doc.id,

                    productName: itemName,

                    storeName:
                        receipt.storeName ||
                        "Unknown Store",

                    purchaseDate:
                        receipt.purchaseDate ||
                        ""

                });

            });

        });


        if (
            receiptProducts.length === 0
        ) {

            const option =
                document.createElement(
                    "option"
                );


            option.value = "";

            option.textContent =
                "No receipt products found";


            receiptProductSelect.appendChild(
                option
            );


            return;
        }


        receiptProducts.forEach(
            (product, index) => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value = index;


                option.textContent =
                    `${product.productName} — ${product.storeName}`;


                receiptProductSelect.appendChild(
                    option
                );

            }
        );


    } catch (error) {

        console.error(
            "Error loading receipt products:",
            error
        );

    }
}


/* =========================
   RECEIPT PRODUCT SELECTION
========================= */

if (receiptProductSelect) {

    receiptProductSelect.addEventListener(
        "change",
        () => {

            const selectedIndex =
                receiptProductSelect.value;


            if (
                selectedIndex === ""
            ) {

                selectedReceiptId = null;


                if (selectedReceiptInfo) {
                    selectedReceiptInfo.style.display =
                        "none";
                }


                return;
            }


            const product =
                receiptProducts[
                    Number(selectedIndex)
                ];


            if (!product) {
                return;
            }


            selectedReceiptId =
                product.receiptId;


            if (productName) {
                productName.value =
                    product.productName;
            }


            if (storeName) {
                storeName.value =
                    product.storeName;
            }


            if (purchaseDate) {
                purchaseDate.value =
                    product.purchaseDate;
            }


            if (selectedStoreName) {
                selectedStoreName.textContent =
                    product.storeName;
            }


            if (selectedPurchaseDate) {
                selectedPurchaseDate.textContent =
                    product.purchaseDate || "-";
            }


            if (selectedReceiptInfo) {
                selectedReceiptInfo.style.display =
                    "block";
            }


            calculateExpiryDate();

        }
    );

}


/* =========================
   FORM INPUT EVENTS
========================= */

if (purchaseDate) {

    purchaseDate.addEventListener(
        "change",
        calculateExpiryDate
    );

}


if (warrantyDuration) {

    warrantyDuration.addEventListener(
        "change",
        calculateExpiryDate
    );

}


/* =========================
   CANCEL BUTTON
========================= */

if (cancelWarrantyBtn) {

    cancelWarrantyBtn.addEventListener(
        "click",
        () => {

            if (warrantyForm) {
                warrantyForm.reset();
            }


            if (expiryDate) {
                expiryDate.value = "";
            }


            if (warrantyStatus) {
                warrantyStatus.value = "";
            }


            selectedReceiptId = null;


            if (selectedReceiptInfo) {
                selectedReceiptInfo.style.display =
                    "none";
            }


            if (receiptProductSelect) {
                receiptProductSelect.value = "";
            }

        }
    );

}


/* =========================
   SAVE WARRANTY
========================= */

if (warrantyForm) {

    warrantyForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            if (!currentUser) {

                alert(
                    "Please log in before saving a warranty."
                );

                return;
            }


            if (
                !expiryDate ||
                !expiryDate.value
            ) {

                alert(
                    "Please enter the purchase date and warranty duration."
                );

                return;
            }


            try {

                const warrantyData = {

                    productName:
                        productName
                            ? productName.value.trim()
                            : "",

                    storeName:
                        storeName
                            ? storeName.value.trim()
                            : "",

                    purchaseDate:
                        purchaseDate
                            ? purchaseDate.value
                            : "",

                    warrantyDurationMonths:
                        warrantyDuration
                            ? parseInt(
                                warrantyDuration.value,
                                10
                            )
                            : 0,

                    warrantyExpiryDate:
                        expiryDate.value,

                    status:
                        warrantyStatus
                            ? warrantyStatus.value
                            : getWarrantyStatus(
                                expiryDate.value
                            ),

                    receiptId:
                        selectedReceiptId || null,

                    createdAt:
                        serverTimestamp()

                };


                await addDoc(

                    collection(
                        db,
                        "users",
                        currentUser.uid,
                        "warranties"
                    ),

                    warrantyData

                );


                alert(
                    "Warranty saved successfully!"
                );


                warrantyForm.reset();


                if (expiryDate) {
                    expiryDate.value = "";
                }


                if (warrantyStatus) {
                    warrantyStatus.value = "";
                }


                selectedReceiptId = null;


                if (selectedReceiptInfo) {
                    selectedReceiptInfo.style.display =
                        "none";
                }


                if (receiptProductSelect) {
                    receiptProductSelect.value = "";
                }


                await loadWarranties();


            } catch (error) {

                console.error(
                    "Error saving warranty:",
                    error
                );


                alert(
                    "Unable to save warranty. Check the console for details."
                );

            }

        }
    );

}


/* =========================
   LOAD SAVED WARRANTIES
========================= */

async function loadWarranties() {

    if (!currentUser) {
        return;
    }


    try {

        const warrantiesRef =
            collection(
                db,
                "users",
                currentUser.uid,
                "warranties"
            );


        const snapshot =
            await getDocs(
                warrantiesRef
            );


        allWarranties = [];


        snapshot.forEach((doc) => {

            allWarranties.push({

                id: doc.id,

                ...doc.data()

            });

        });


        updateDashboard();


    } catch (error) {

        console.error(
            "Error loading warranties:",
            error
        );

    }
}


/* =========================
   UPDATE WARRANTY DASHBOARD
========================= */

function updateDashboard() {

    const active = [];

    const expiring = [];

    const expired = [];


    allWarranties.forEach(
        (warranty) => {

            const status =
                getWarrantyStatus(
                    warranty.warrantyExpiryDate
                );


            if (status === "Active") {

                active.push(warranty);

            } else if (
                status === "Expiring Soon"
            ) {

                expiring.push(warranty);

            } else if (
                status === "Expired"
            ) {

                expired.push(warranty);

            }

        }
    );


    if (activeWarrantyCount) {
        activeWarrantyCount.textContent =
            active.length;
    }


    if (expiringWarrantyCount) {
        expiringWarrantyCount.textContent =
            expiring.length;
    }


    if (expiredWarrantyCount) {
        expiredWarrantyCount.textContent =
            expired.length;
    }


    if (totalWarrantyCount) {
        totalWarrantyCount.textContent =
            allWarranties.length;
    }


    renderUpcomingWarranties(
        expiring
    );


    if (warrantyReminderText) {

        if (expiring.length === 0) {

            warrantyReminderText.textContent =
                "No warranties are currently expiring soon.";

        } else {

            warrantyReminderText.textContent =
                `${expiring.length} product` +
                `${expiring.length > 1 ? "s are" : " is"}` +
                " expiring soon.";

        }

    }


    renderWarrantyHistory(
        expired
    );

}


/* =========================
   UPCOMING WARRANTIES
========================= */

function renderUpcomingWarranties(
    warranties
) {

    if (!upcomingWarrantyBody) {
        return;
    }


    upcomingWarrantyBody.innerHTML =
        "";


    if (upcomingWarrantyCount) {

        upcomingWarrantyCount.textContent =
            `${warranties.length} product` +
            `${warranties.length !== 1 ? "s" : ""}`;

    }


    if (warranties.length === 0) {

        upcomingWarrantyBody.innerHTML = `
            <tr>
                <td colspan="4">
                    No warranties are expiring within 30 days.
                </td>
            </tr>
        `;

        return;
    }


    warranties.forEach(
        (warranty) => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${warranty.productName || "-"}
                </td>

                <td>
                    ${warranty.storeName || "-"}
                </td>

                <td>
                    ${warranty.warrantyExpiryDate || "-"}
                </td>

                <td>
                    <span class="warranty-status">
                        Expiring Soon
                    </span>
                </td>

            `;


            upcomingWarrantyBody.appendChild(
                row
            );

        }
    );

}


/* =========================
   WARRANTY HISTORY
========================= */

function renderWarrantyHistory(
    warranties
) {

    if (!warrantyHistoryBody) {
        return;
    }


    warrantyHistoryBody.innerHTML =
        "";


    if (warranties.length === 0) {

        warrantyHistoryBody.innerHTML = `
            <tr>
                <td colspan="4">
                    No expired warranties found.
                </td>
            </tr>
        `;

        return;
    }


    warranties.forEach(
        (warranty) => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${warranty.productName || "-"}
                </td>

                <td>
                    ${warranty.storeName || "-"}
                </td>

                <td>
                    ${warranty.purchaseDate || "-"}
                </td>

                <td>
                    ${warranty.warrantyExpiryDate || "-"}
                </td>

            `;


            warrantyHistoryBody.appendChild(
                row
            );

        }
    );

}


/* =========================
   AUTH STATE
========================= */

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            currentUser = null;

            console.log(
                "No user is currently logged in."
            );

            return;
        }


        currentUser = user;


        console.log(
            "Logged-in User UID:",
            user.uid
        );


        await loadReceiptProducts();

        await loadWarranties();

    }
);