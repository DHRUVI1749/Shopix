// ==========================================
// SHOPIX - WARRANTY MODULE
// STEP 6: CONNECT WARRANTIES WITH RECEIPTS
// ==========================================

import { auth, db } from "../firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    collection,
    getDocs,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


// ==========================================
// FORM ELEMENTS
// ==========================================

const warrantyForm = document.getElementById("warrantyForm");

const productName = document.getElementById("productName");
const storeName = document.getElementById("storeName");
const purchaseDate = document.getElementById("purchaseDate");
const warrantyDuration = document.getElementById("warrantyDuration");
const expiryDate = document.getElementById("expiryDate");
const warrantyStatus = document.getElementById("warrantyStatus");

const cancelWarrantyBtn =
    document.getElementById("cancelWarrantyBtn");

const receiptProductSelect =
    document.getElementById("receiptProductSelect");

const selectedReceiptInfo =
    document.getElementById("selectedReceiptInfo");

const selectedStoreName =
    document.getElementById("selectedStoreName");

const selectedPurchaseDate =
    document.getElementById("selectedPurchaseDate");


// ==========================================
// VARIABLES
// ==========================================

let currentUser = null;

let receiptProducts = [];

let selectedReceiptId = null;


// ==========================================
// CALCULATE WARRANTY EXPIRY DATE
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

    const month =
        String(date.getMonth() + 1).padStart(2, "0");

    const day =
        String(date.getDate()).padStart(2, "0");

    expiryDate.value =
        `${year}-${month}-${day}`;

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

    const difference =
        expiryDay - today;

    const daysRemaining =
        Math.ceil(
            difference /
            (1000 * 60 * 60 * 24)
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
// LOAD PRODUCTS FROM RECEIPTS
// ==========================================

async function loadReceiptProducts() {

    if (!currentUser) {

        console.log(
            "No user is currently logged in."
        );

        return;
    }

    try {

        const receiptsRef = collection(
            db,
            "users",
            currentUser.uid,
            "receipts"
        );

        const snapshot =
            await getDocs(receiptsRef);

        receiptProducts = [];

        receiptProductSelect.innerHTML = `
            <option value="">
                Select a product
            </option>
        `;


        snapshot.forEach((receiptDoc) => {

            const receipt =
                receiptDoc.data();

            const items =
                Array.isArray(receipt.items)
                    ? receipt.items
                    : [];


            items.forEach((item) => {

                let productNameValue = "";

                if (typeof item === "object") {

                    productNameValue =
                        item.name || "Unknown Product";

                } else {

                    productNameValue =
                        String(item);
                }


                const product = {

                    receiptId: receiptDoc.id,

                    productName:
                        productNameValue,

                    storeName:
                        receipt.storeName || "",

                    purchaseDate:
                        receipt.purchaseDate || ""

                };


                receiptProducts.push(product);


                const option =
                    document.createElement("option");

                option.value =
                    String(
                        receiptProducts.length - 1
                    );

                option.textContent =
                    `${product.productName} — ${
                        product.storeName || "Unknown Store"
                    }`;


                receiptProductSelect.appendChild(
                    option
                );

            });

        });


        if (receiptProducts.length === 0) {

            const option =
                document.createElement("option");

            option.value = "";

            option.textContent =
                "No receipt products found";

            receiptProductSelect.appendChild(
                option
            );

        }


        console.log(
            "Receipt products loaded:",
            receiptProducts.length
        );

    } catch (error) {

        console.error(
            "Error loading receipt products:",
            error
        );

    }
}


// ==========================================
// WHEN PRODUCT IS SELECTED
// ==========================================

receiptProductSelect.addEventListener(
    "change",
    () => {

        const selectedIndex =
            receiptProductSelect.value;


        if (selectedIndex === "") {

            selectedReceiptId = null;

            selectedReceiptInfo.style.display =
                "none";

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


        productName.value =
            product.productName;

        storeName.value =
            product.storeName;

        purchaseDate.value =
            product.purchaseDate;


        selectedStoreName.textContent =
            product.storeName || "-";

        selectedPurchaseDate.textContent =
            product.purchaseDate || "-";


        selectedReceiptInfo.style.display =
            "block";


        calculateExpiryDate();

    }
);


// ==========================================
// FORM EVENTS
// ==========================================

purchaseDate.addEventListener(
    "change",
    calculateExpiryDate
);

warrantyDuration.addEventListener(
    "input",
    calculateExpiryDate
);


// ==========================================
// CANCEL BUTTON
// ==========================================

cancelWarrantyBtn.addEventListener(
    "click",
    () => {

        warrantyForm.reset();

        expiryDate.value = "";

        warrantyStatus.value = "";

        selectedReceiptId = null;

        selectedReceiptInfo.style.display =
            "none";

        receiptProductSelect.value = "";

    }
);


// ==========================================
// SAVE WARRANTY
// ==========================================

warrantyForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        if (!currentUser) {

            alert(
                "Please log in to save warranty details."
            );

            return;
        }


        if (
            !expiryDate.value ||
            !warrantyStatus.value
        ) {

            alert(
                "Please enter purchase date and warranty duration."
            );

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


            await addDoc(
                warrantiesRef,
                {

                    productName:
                        productName.value.trim(),

                    storeName:
                        storeName.value.trim(),

                    purchaseDate:
                        purchaseDate.value,

                    warrantyDurationMonths:
                        parseInt(
                            warrantyDuration.value
                        ),

                    warrantyExpiryDate:
                        expiryDate.value,

                    status:
                        warrantyStatus.value,

                    receiptId:
                        selectedReceiptId || null,

                    createdAt:
                        serverTimestamp()

                }
            );


            alert(
                "Warranty saved successfully!"
            );


            warrantyForm.reset();

            expiryDate.value = "";

            warrantyStatus.value = "";

            selectedReceiptId = null;

            selectedReceiptInfo.style.display =
                "none";

            receiptProductSelect.value = "";


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


// ==========================================
// AUTHENTICATION
// ==========================================

onAuthStateChanged(
    auth,
    async (user) => {

        if (user) {

            currentUser = user;

            console.log(
                "Logged-in User UID:",
                user.uid
            );

            await loadReceiptProducts();

        } else {

            currentUser = null;

            console.log(
                "No user is currently logged in."
            );

        }

    }
);