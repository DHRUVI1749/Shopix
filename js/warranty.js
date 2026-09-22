import { auth, db } from "./firebase.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    collection,
    getDocs,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


/* =========================================================
   FORM ELEMENTS
========================================================= */

const warrantyForm = document.getElementById("warrantyForm");

const productName = document.getElementById("productName");
const storeName = document.getElementById("storeName");
const purchaseDate = document.getElementById("purchaseDate");
const warrantyDuration = document.getElementById("warrantyDuration");
const expiryDate = document.getElementById("expiryDate");
const warrantyStatus = document.getElementById("warrantyStatus");

const cancelWarrantyBtn =
    document.getElementById("cancelWarrantyBtn");


/* =========================================================
   RECEIPT ELEMENTS
========================================================= */

const receiptProductSelect =
    document.getElementById("receiptProductSelect");

const selectedReceiptInfo =
    document.getElementById("selectedReceiptInfo");

const selectedStoreName =
    document.getElementById("selectedStoreName");

const selectedPurchaseDate =
    document.getElementById("selectedPurchaseDate");


/* =========================================================
   VARIABLES
========================================================= */

let currentUser = null;
let receiptProducts = [];
let selectedReceiptId = null;


/* =========================================================
   DATE FUNCTIONS
========================================================= */

/*
   Converts:
   YYYY-MM-DD
   DD-MM-YYYY
   DD/MM/YYYY

   into:
   YYYY-MM-DD
*/

function normalizeDate(value) {
    if (!value) {
        return "";
    }

    const text = String(value).trim();

    /* Already YYYY-MM-DD */
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        return text;
    }

    /* DD-MM-YYYY or DD/MM/YYYY */
    const parts = text.split(/[-/]/);

    if (parts.length !== 3) {
        return "";
    }

    const day = parts[0].padStart(2, "0");
    const month = parts[1].padStart(2, "0");
    const year = parts[2];

    if (year.length !== 4) {
        return "";
    }

    return `${year}-${month}-${day}`;
}


/*
   Converts:
   YYYY-MM-DD

   into:
   DD-MM-YYYY
*/

function formatDate(value) {
    const isoDate = normalizeDate(value);

    if (!isoDate) {
        return "";
    }

    const parts = isoDate.split("-");

    if (parts.length !== 3) {
        return "";
    }

    const year = parts[0];
    const month = parts[1];
    const day = parts[2];

    return `${day}-${month}-${year}`;
}


/*
   Creates a local JavaScript Date.
*/

function createDate(value) {
    const isoDate = normalizeDate(value);

    if (!isoDate) {
        return null;
    }

    const parts = isoDate.split("-");

    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);

    const date = new Date(year, month - 1, day);

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    return date;
}


/* =========================================================
   CALCULATE EXPIRY DATE
========================================================= */

function calculateExpiryDate() {
    if (!purchaseDate || !warrantyDuration || !expiryDate) {
        return;
    }

    const purchaseISO = normalizeDate(purchaseDate.value);
    const months = Number(warrantyDuration.value);

    if (!purchaseISO || !months) {
        expiryDate.value = "";

        if (warrantyStatus) {
            warrantyStatus.value = "";
        }

        return;
    }

    const expiry = createDate(purchaseISO);

    if (!expiry) {
        expiryDate.value = "";

        if (warrantyStatus) {
            warrantyStatus.value = "";
        }

        return;
    }

    /*
       Add selected warranty duration.
    */
    expiry.setMonth(expiry.getMonth() + months);

    const year = expiry.getFullYear();

    const month = String(
        expiry.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        expiry.getDate()
    ).padStart(2, "0");

    const expiryISO =
        `${year}-${month}-${day}`;

    /*
       Display DD-MM-YYYY
    */
    expiryDate.value =
        formatDate(expiryISO);

    /*
       Calculate status
    */
    updateWarrantyStatus(expiryISO);
}


/* =========================================================
   CALCULATE WARRANTY STATUS
========================================================= */

function getWarrantyStatus(expiryValue) {
    const expiry = createDate(expiryValue);

    if (!expiry) {
        return "";
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);

    const difference =
        expiry.getTime() - today.getTime();

    const daysRemaining =
        Math.ceil(
            difference / (1000 * 60 * 60 * 24)
        );

    if (daysRemaining < 0) {
        return "Expired";
    }

    if (daysRemaining <= 30) {
        return "Expiring Soon";
    }

    return "Active";
}


/* =========================================================
   UPDATE STATUS FIELD
========================================================= */

function updateWarrantyStatus(expiryISO) {
    if (!warrantyStatus) {
        return;
    }

    const dateToCheck =
        expiryISO || normalizeDate(expiryDate.value);

    if (!dateToCheck) {
        warrantyStatus.value = "";
        return;
    }

    warrantyStatus.value =
        getWarrantyStatus(dateToCheck);
}


/* =========================================================
   FORM EVENTS
========================================================= */

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


/* =========================================================
   LOAD RECEIPT PRODUCTS
========================================================= */

async function loadReceiptProducts() {
    if (!currentUser || !receiptProductSelect) {
        return;
    }

    receiptProducts = [];

    receiptProductSelect.innerHTML =
        '<option value="">Select a product</option>';

    try {
        const receiptsRef = collection(
            db,
            "users",
            currentUser.uid,
            "receipts"
        );

        const snapshot =
            await getDocs(receiptsRef);

        snapshot.forEach((doc) => {
            const receipt = doc.data();

            const items = Array.isArray(receipt.items)
                ? receipt.items
                : [];

            items.forEach((item) => {
                let itemName = "";

                if (typeof item === "string") {
                    itemName = item;
                } else if (item && item.name) {
                    itemName = item.name;
                }

                if (!itemName) {
                    return;
                }

                receiptProducts.push({
                    receiptId: doc.id,
                    productName: itemName,
                    storeName:
                        receipt.storeName || "Unknown Store",
                    purchaseDate:
                        receipt.purchaseDate || ""
                });
            });
        });

        if (receiptProducts.length === 0) {
            const option =
                document.createElement("option");

            option.value = "";
            option.textContent =
                "No receipt products found";

            receiptProductSelect.appendChild(option);

            return;
        }

        receiptProducts.forEach((product, index) => {
            const option =
                document.createElement("option");

            option.value = index;

            option.textContent =
                `${product.productName} — ${product.storeName}`;

            receiptProductSelect.appendChild(option);
        });

    } catch (error) {
        console.error(
            "Error loading receipt products:",
            error
        );
    }
}


/* =========================================================
   RECEIPT PRODUCT SELECT
========================================================= */

if (receiptProductSelect) {
    receiptProductSelect.addEventListener(
        "change",
        function () {
            const selectedIndex =
                receiptProductSelect.value;

            if (selectedIndex === "") {
                selectedReceiptId = null;

                if (selectedReceiptInfo) {
                    selectedReceiptInfo.style.display =
                        "none";
                }

                return;
            }

            const product =
                receiptProducts[Number(selectedIndex)];

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
                    normalizeDate(
                        product.purchaseDate
                    );
            }

            if (selectedStoreName) {
                selectedStoreName.textContent =
                    product.storeName;
            }

            if (selectedPurchaseDate) {
                selectedPurchaseDate.textContent =
                    formatDate(
                        product.purchaseDate
                    ) || "-";
            }

            if (selectedReceiptInfo) {
                selectedReceiptInfo.style.display =
                    "block";
            }

            /*
               Recalculate expiry/status
               after receipt information is selected.
            */
            calculateExpiryDate();
        }
    );
}


/* =========================================================
   CANCEL BUTTON
========================================================= */

if (cancelWarrantyBtn) {
    cancelWarrantyBtn.addEventListener(
        "click",
        function (event) {
            event.preventDefault();

            /*
               Reset complete form.
            */
            if (warrantyForm) {
                warrantyForm.reset();
            }

            /*
               Clear calculated fields.
            */
            if (expiryDate) {
                expiryDate.value = "";
            }

            if (warrantyStatus) {
                warrantyStatus.value = "";
            }

            /*
               Clear receipt selection.
            */
            selectedReceiptId = null;

            if (receiptProductSelect) {
                receiptProductSelect.value = "";
            }

            /*
               Hide receipt information.
            */
            if (selectedReceiptInfo) {
                selectedReceiptInfo.style.display =
                    "none";
            }

            /*
               Clear receipt information.
            */
            if (selectedStoreName) {
                selectedStoreName.textContent = "-";
            }

            if (selectedPurchaseDate) {
                selectedPurchaseDate.textContent = "-";
            }
        }
    );
}


/* =========================================================
   SAVE WARRANTY
========================================================= */

if (warrantyForm) {
    warrantyForm.addEventListener(
        "submit",
        async function (event) {
            event.preventDefault();

            /*
               Firebase requires an authenticated user
               to save under users/{uid}.
            */
            if (!currentUser) {
                alert(
                    "Please log in before saving a warranty."
                );

                return;
            }

            const purchaseISO =
                purchaseDate
                    ? normalizeDate(
                        purchaseDate.value
                    )
                    : "";

            const expiryISO =
                expiryDate
                    ? normalizeDate(
                        expiryDate.value
                    )
                    : "";

            const duration =
                warrantyDuration
                    ? Number(
                        warrantyDuration.value
                    )
                    : 0;

            /*
               Validate required fields.
            */
            if (
                !productName ||
                !productName.value.trim()
            ) {
                alert(
                    "Please enter the product name."
                );

                return;
            }

            if (!purchaseISO) {
                alert(
                    "Please select the purchase date."
                );

                return;
            }

            if (!duration) {
                alert(
                    "Please select the warranty duration."
                );

                return;
            }

            if (!expiryISO) {
                alert(
                    "Warranty expiry date could not be calculated."
                );

                return;
            }

            try {
                const warrantyData = {
                    productName:
                        productName.value.trim(),

                    storeName:
                        storeName
                            ? storeName.value.trim()
                            : "",

                    purchaseDate:
                        purchaseISO,

                    warrantyDurationMonths:
                        duration,

                    warrantyExpiryDate:
                        expiryISO,

                    status:
                        getWarrantyStatus(
                            expiryISO
                        ),

                    receiptId:
                        selectedReceiptId || null,

                    createdAt:
                        serverTimestamp()
                };

                /*
                   Save to:
                   users/{uid}/warranties
                */
                await addDoc(
                    collection(
                        db,
                        "users",
                        currentUser.uid,
                        "warranties"
                    ),
                    warrantyData
                );

                /*
                   SUCCESS POPUP
                */
                alert(
                    "Warranty saved successfully!"
                );

                /*
                   Clear form after successful save.
                */
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

                if (receiptProductSelect) {
                    receiptProductSelect.value = "";
                }

                if (selectedReceiptInfo) {
                    selectedReceiptInfo.style.display =
                        "none";
                }

                if (selectedStoreName) {
                    selectedStoreName.textContent = "-";
                }

                if (selectedPurchaseDate) {
                    selectedPurchaseDate.textContent = "-";
                }

            } catch (error) {
                console.error(
                    "Error saving warranty:",
                    error
                );

                alert(
                    "Unable to save warranty.\n\n" +
                    error.message
                );
            }
        }
    );
}


/* =========================================================
   AUTHENTICATION
========================================================= */

onAuthStateChanged(
    auth,
    async function (user) {
        if (!user) {
            currentUser = null;

            console.log(
                "No user is currently logged in."
            );

            return;
        }

        currentUser = user;

        console.log(
            "Warranty user:",
            currentUser.uid
        );

        await loadReceiptProducts();
    }
);