import {
    auth,
    db
} from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    collection,
    getDocs,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ===============================
// DOM ELEMENTS
// ===============================

const warrantyForm = document.getElementById("warrantyForm");

const productName = document.getElementById("productName");
const storeName = document.getElementById("storeName");
const purchaseDate = document.getElementById("purchaseDate");
const warrantyDuration = document.getElementById("warrantyDuration");
const expiryDate = document.getElementById("expiryDate");
const warrantyStatus = document.getElementById("warrantyStatus");

const saveWarrantyBtn = document.getElementById("saveWarrantyBtn");
const cancelWarrantyBtn = document.getElementById("cancelWarrantyBtn");

const receiptProductSelect =
    document.getElementById("receiptProductSelect");

const selectedReceiptInfo =
    document.getElementById("selectedReceiptInfo");

const selectedReceiptStore =
    document.getElementById("selectedReceiptStore");

const selectedReceiptDate =
    document.getElementById("selectedReceiptDate");


// ===============================
// VARIABLES
// ===============================

let currentUser = null;
let selectedReceiptId = null;
let receipts = [];


// ===============================
// DATE FUNCTIONS
// ===============================

function normalizeDate(value) {
    if (!value) return "";

    value = String(value).trim();

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }

    // DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
        const [day, month, year] = value.split("-");
        return `${year}-${month}-${day}`;
    }

    // DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
        const [day, month, year] = value.split("/");
        return `${year}-${month}-${day}`;
    }

    return "";
}


function formatDate(value) {
    const iso = normalizeDate(value);

    if (!iso) return "";

    const [year, month, day] = iso.split("-");

    return `${day}-${month}-${year}`;
}


function dateFromISO(value) {
    const iso = normalizeDate(value);

    if (!iso) return null;

    const [year, month, day] = iso.split("-").map(Number);

    return new Date(year, month - 1, day);
}


// ===============================
// CALCULATE EXPIRY DATE
// ===============================

function calculateExpiryDate() {

    if (!purchaseDate || !warrantyDuration || !expiryDate) {
        return;
    }

    const purchaseISO = normalizeDate(purchaseDate.value);
    const duration = parseInt(warrantyDuration.value, 10);

    if (!purchaseISO || isNaN(duration)) {
        expiryDate.value = "";

        if (warrantyStatus) {
            warrantyStatus.value = "";
        }

        return;
    }

    const purchase = dateFromISO(purchaseISO);

    if (!purchase) {
        expiryDate.value = "";
        warrantyStatus.value = "";
        return;
    }

    const expiry = new Date(purchase);

    expiry.setMonth(expiry.getMonth() + duration);

    const year = expiry.getFullYear();
    const month = String(expiry.getMonth() + 1).padStart(2, "0");
    const day = String(expiry.getDate()).padStart(2, "0");

    const expiryISO = `${year}-${month}-${day}`;

    // Display DD-MM-YYYY
    expiryDate.value = formatDate(expiryISO);

    updateWarrantyStatus(expiryISO);
}


// ===============================
// WARRANTY STATUS
// ===============================

function getWarrantyStatus(expiry) {

    const expiryDateObj = dateFromISO(expiry);

    if (!expiryDateObj) {
        return "";
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);
    expiryDateObj.setHours(0, 0, 0, 0);

    const difference =
        expiryDateObj.getTime() - today.getTime();

    const daysLeft =
        Math.ceil(difference / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
        return "Expired";
    }

    if (daysLeft <= 30) {
        return "Expiring Soon";
    }

    return "Active";
}


function updateWarrantyStatus(expiryISO = null) {

    if (!warrantyStatus) return;

    let expiry = expiryISO;

    if (!expiry) {
        expiry = normalizeDate(expiryDate.value);
    }

    if (!expiry) {
        warrantyStatus.value = "";
        return;
    }

    warrantyStatus.value = getWarrantyStatus(expiry);
}


// ===============================
// LOAD RECEIPTS
// ===============================

async function loadReceipts() {

    if (!currentUser || !receiptProductSelect) {
        return;
    }

    try {

        const receiptsRef =
            collection(
                db,
                "users",
                currentUser.uid,
                "receipts"
            );

        const snapshot = await getDocs(receiptsRef);

        receipts = [];

        receiptProductSelect.innerHTML =
            `<option value="">Select a product</option>`;

        snapshot.forEach((doc) => {

            const data = doc.data();

            const receipt = {
                id: doc.id,
                ...data
            };

            receipts.push(receipt);

            if (Array.isArray(data.items)) {

                data.items.forEach((item, index) => {

                    const option =
                        document.createElement("option");

                    option.value =
                        `${doc.id}|${index}`;

                    option.textContent =
                        item.name || `Product ${index + 1}`;

                    receiptProductSelect.appendChild(option);
                });
            }
        });

    } catch (error) {

        console.error(
            "Error loading receipts:",
            error
        );
    }
}


// ===============================
// RECEIPT PRODUCT SELECT
// ===============================

if (receiptProductSelect) {

    receiptProductSelect.addEventListener(
        "change",
        () => {

            const value =
                receiptProductSelect.value;

            if (!value) {

                selectedReceiptId = null;

                if (selectedReceiptInfo) {
                    selectedReceiptInfo.style.display = "none";
                }

                return;
            }

            const [receiptId, itemIndex] =
                value.split("|");

            const receipt =
                receipts.find(
                    r => r.id === receiptId
                );

            if (!receipt) return;

            selectedReceiptId = receiptId;

            const item =
                receipt.items?.[Number(itemIndex)];

            if (productName && item) {
                productName.value =
                    item.name || "";
            }

            if (storeName) {
                storeName.value =
                    receipt.storeName || "";
            }

            if (purchaseDate) {

                const date =
                    normalizeDate(
                        receipt.purchaseDate
                    );

                purchaseDate.value = date;
            }

            if (selectedReceiptStore) {
                selectedReceiptStore.textContent =
                    receipt.storeName || "-";
            }

            if (selectedReceiptDate) {
                selectedReceiptDate.textContent =
                    formatDate(
                        receipt.purchaseDate
                    ) || "-";
            }

            if (selectedReceiptInfo) {
                selectedReceiptInfo.style.display =
                    "block";
            }

            calculateExpiryDate();
        }
    );
}


// ===============================
// PURCHASE DATE CHANGE
// ===============================

if (purchaseDate) {

    purchaseDate.addEventListener(
        "change",
        calculateExpiryDate
    );
}


// ===============================
// WARRANTY DURATION CHANGE
// ===============================

if (warrantyDuration) {

    warrantyDuration.addEventListener(
        "change",
        calculateExpiryDate
    );
}


// ===============================
// EXPIRY DATE CHANGE
// ===============================

if (expiryDate) {

    expiryDate.addEventListener(
        "input",
        () => updateWarrantyStatus()
    );
}


// ===============================
// CANCEL BUTTON
// ===============================

if (cancelWarrantyBtn) {

    cancelWarrantyBtn.addEventListener(
        "click",
        (event) => {

            event.preventDefault();

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


// ===============================
// SAVE WARRANTY
// ===============================

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

            const purchaseISO =
                normalizeDate(
                    purchaseDate?.value
                );

            const expiryISO =
                normalizeDate(
                    expiryDate?.value
                );

            const warrantyData = {

                productName:
                    productName?.value.trim() || "",

                storeName:
                    storeName?.value.trim() || "",

                purchaseDate:
                    purchaseISO,

                warrantyDuration:
                    parseInt(
                        warrantyDuration?.value || "0",
                        10
                    ),

                warrantyExpiryDate:
                    expiryISO,

                status:
                    getWarrantyStatus(expiryISO),

                receiptId:
                    selectedReceiptId || null,

                createdAt:
                    serverTimestamp()
            };

            try {

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

            } catch (error) {

                console.error(
                    "Error saving warranty:",
                    error
                );

                alert(
                    "Unable to save warranty. Please try again."
                );
            }
        }
    );
}


// ===============================
// AUTH STATE
// ===============================

onAuthStateChanged(
    auth,
    async (user) => {

        currentUser = user;

        if (currentUser) {
            await loadReceipts();
        }
    }
);