import {
    auth,
    db
} from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    collection,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";



/* =========================================================
   DOM
========================================================= */

const receiptSelect =
    document.getElementById("receiptSelect");

const receiptInfo =
    document.getElementById("receiptInfo");

const receiptStore =
    document.getElementById("receiptStore");

const receiptPurchaseDate =
    document.getElementById("receiptPurchaseDate");

const receiptItemCount =
    document.getElementById("receiptItemCount");

const itemStep =
    document.getElementById("itemStep");

const receiptItems =
    document.getElementById("receiptItems");

const durationStep =
    document.getElementById("durationStep");

const selectedProductName =
    document.getElementById("selectedProductName");

const warrantyDuration =
    document.getElementById("warrantyDuration");

const customDurationBox =
    document.getElementById("customDurationBox");

const customDurationValue =
    document.getElementById("customDurationValue");

const customDurationUnit =
    document.getElementById("customDurationUnit");

const expiryPreview =
    document.getElementById("expiryPreview");

const calculatedExpiry =
    document.getElementById("calculatedExpiry");

const addWarrantyBtn =
    document.getElementById("addWarrantyBtn");

const anotherItemBox =
    document.getElementById("anotherItemBox");

const anotherItemQuestion =
    document.getElementById("anotherItemQuestion");

const yesAnotherItemBtn =
    document.getElementById("yesAnotherItemBtn");

const noAnotherItemBtn =
    document.getElementById("noAnotherItemBtn");

const noReceiptItems =
    document.getElementById("noReceiptItems");

const warrantyTableBody =
    document.getElementById("warrantyTableBody");

const warrantyEmpty =
    document.getElementById("warrantyEmpty");

const warrantyFilter =
    document.getElementById("warrantyFilter");

const activeWarrantyCount =
    document.getElementById("activeWarrantyCount");

const expiringWarrantyCount =
    document.getElementById("expiringWarrantyCount");

const expiredWarrantyCount =
    document.getElementById("expiredWarrantyCount");

const totalWarrantyCount =
    document.getElementById("totalWarrantyCount");

const warrantyReminderText =
    document.getElementById("warrantyReminderText");

const warrantyActionMessage =
    document.getElementById("warrantyActionMessage");

const editWarrantyModal =
    document.getElementById("editWarrantyModal");

const closeEditWarrantyModal =
    document.getElementById("closeEditWarrantyModal");

const cancelEditWarranty =
    document.getElementById("cancelEditWarranty");

const editWarrantyForm =
    document.getElementById("editWarrantyForm");

const editProductName =
    document.getElementById("editProductName");

const editStoreName =
    document.getElementById("editStoreName");

const editPurchaseDate =
    document.getElementById("editPurchaseDate");

const editWarrantyDuration =
    document.getElementById("editWarrantyDuration");

const editWarrantyExpiry =
    document.getElementById("editWarrantyExpiry");

const editWarrantyMessage =
    document.getElementById("editWarrantyMessage");

const saveWarrantyEdit =
    document.getElementById("saveWarrantyEdit");



/* =========================================================
   PROFILE
========================================================= */

const profileButton =
    document.getElementById("profileButton");

const profileModal =
    document.getElementById("profileModal");

const closeProfileModal =
    document.getElementById("closeProfileModal");

const profileAvatar =
    document.getElementById("profileAvatar");

const profileLargeAvatar =
    document.getElementById("profileLargeAvatar");

const profileName =
    document.getElementById("profileName");

const profileNameInput =
    document.getElementById("profileNameInput");

const profileEmailInput =
    document.getElementById("profileEmailInput");

const profileMessage =
    document.getElementById("profileMessage");

const saveProfile =
    document.getElementById("saveProfile");



/* =========================================================
   STATE
========================================================= */

let currentUser = null;

let receipts = [];

let warranties = [];

let selectedReceipt = null;

let selectedItem = null;

let editingWarrantyId = null;

let warrantyActionTimer = null;



/* =========================================================
   HELPERS
========================================================= */

function normalizeDate(value) {

    if (!value) {
        return null;
    }


    if (
        typeof value === "object" &&
        typeof value.toDate === "function"
    ) {

        return value.toDate();

    }


    if (
        typeof value === "object" &&
        typeof value.seconds === "number"
    ) {

        return new Date(
            value.seconds * 1000
        );

    }


    if (value instanceof Date) {
        return new Date(value);
    }


    /*
       Handle YYYY-MM-DD
    */

    if (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {

        const [
            year,
            month,
            day
        ] = value.split("-").map(Number);

        return new Date(
            year,
            month - 1,
            day
        );

    }


    /*
       Handle DD-MM-YYYY
    */

    if (
        typeof value === "string" &&
        /^\d{2}-\d{2}-\d{4}$/.test(value)
    ) {

        const [
            day,
            month,
            year
        ] = value.split("-").map(Number);

        return new Date(
            year,
            month - 1,
            day
        );

    }


    const date =
        new Date(value);


    if (isNaN(date.getTime())) {
        return null;
    }


    return date;

}



function toISODate(date) {

    const d =
        normalizeDate(date);


    if (!d) {
        return "";
    }


    return [
        d.getFullYear(),
        String(
            d.getMonth() + 1
        ).padStart(2, "0"),
        String(
            d.getDate()
        ).padStart(2, "0")
    ].join("-");

}



function showWarrantyAction(
    message,
    type = ""
) {

    if (!warrantyActionMessage) {
        return;
    }


    clearTimeout(warrantyActionTimer);

    warrantyActionMessage.textContent =
        message;

    warrantyActionMessage.className =
        `warranty-action-message ${type}`.trim();


    if (message && type === "success") {

        warrantyActionTimer = setTimeout(
            () => {

                warrantyActionMessage.textContent = "";

                warrantyActionMessage.className =
                    "warranty-action-message";

            },
            5000
        );

    }

}



function formatDate(value) {

    const date =
        normalizeDate(value);


    if (!date) {
        return "—";
    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}



function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}



/* =========================================================
   WARRANTY STATUS
========================================================= */

function calculateDaysLeft(expiryDate) {

    const expiry =
        normalizeDate(expiryDate);


    if (!expiry) {
        return null;
    }


    const today =
        new Date();


    today.setHours(
        0, 0, 0, 0
    );

    expiry.setHours(
        0, 0, 0, 0
    );


    return Math.ceil(
        (
            expiry.getTime() -
            today.getTime()
        ) /
        (
            1000 *
            60 *
            60 *
            24
        )
    );

}



function getWarrantyStatus(expiryDate) {

    const days =
        calculateDaysLeft(
            expiryDate
        );


    if (days === null) {
        return "Active";
    }


    if (days < 0) {
        return "Expired";
    }


    if (days <= 30) {
        return "Expiring Soon";
    }


    return "Active";

}



/* =========================================================
   CALCULATE EXPIRY
========================================================= */

function calculateExpiry(
    purchaseDate,
    duration
) {

    const date =
        normalizeDate(
            purchaseDate
        );


    if (!date || !duration) {
        return null;
    }


    const result =
        new Date(date);


    const match =
        duration.match(
            /^(\d+)\s+(Day|Days|Month|Months|Year|Years)$/i
        );


    if (!match) {
        return null;
    }


    const amount =
        Number(match[1]);

    const unit =
        match[2].toLowerCase();


    if (unit === "day" || unit === "days") {
    result.setDate(result.getDate() + amount);
}
else if (unit === "month" || unit === "months") {
    result.setMonth(result.getMonth() + amount);
}
else {
    result.setFullYear(result.getFullYear() + amount);
}


    return result;

}



/* =========================================================
   GET CUSTOM DURATION
========================================================= */

function getSelectedDuration() {

    const selected =
        warrantyDuration.value;


    if (selected !== "CUSTOM") {
        return selected;
    }


    const amount =
        Number(
            customDurationValue.value
        );


    const unit =
        customDurationUnit.value;


    if (
        !amount ||
        amount < 1
    ) {

        return "";

    }


    return `${amount} ${unit}`;

}



/* =========================================================
   LOAD RECEIPTS
========================================================= */

async function loadReceipts() {

    receiptSelect.innerHTML = `
        <option value="">
            Loading receipts...
        </option>
    `;


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


        receipts = [];


        snapshot.forEach(
            receiptDoc => {

                receipts.push({
                    id: receiptDoc.id,
                    ...receiptDoc.data()
                });

            }
        );


        receiptSelect.innerHTML = `
            <option value="">
                Select a saved receipt
            </option>
        `;


        if (receipts.length === 0) {

            receiptSelect.innerHTML = `
                <option value="">
                    No saved receipts found
                </option>
            `;

            return;

        }


        receipts.forEach(
            receipt => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    receipt.id;


                const store =
                    receipt.storeName ||
                    "Unknown Store";


                const date =
                    formatDate(
                        receipt.purchaseDate
                    );


                option.textContent =
                    `${store} • ${date}`;


                receiptSelect.appendChild(
                    option
                );

            }
        );

    }

    catch (error) {

        console.error(
            "Receipt loading error:",
            error
        );


        receiptSelect.innerHTML = `
            <option value="">
                Unable to load receipts
            </option>
        `;

    }

}



/* =========================================================
   RECEIPT SELECT
========================================================= */

receiptSelect.addEventListener(
    "change",
    async () => {

        const receiptId =
            receiptSelect.value;


        selectedReceipt =
            receipts.find(
                receipt =>
                    receipt.id ===
                    receiptId
            ) || null;


        resetItemSelection();


        if (!selectedReceipt) {

            receiptInfo.style.display =
                "none";

            itemStep.style.display =
                "none";

            noReceiptItems.style.display =
                "none";

            return;

        }


        receiptInfo.style.display =
            "grid";


        receiptStore.textContent =
            selectedReceipt.storeName ||
            "Unknown Store";


        receiptPurchaseDate.textContent =
            formatDate(
                selectedReceipt.purchaseDate
            );


        const items =
            getReceiptItems(
                selectedReceipt
            );


        receiptItemCount.textContent =
            items.length;


        if (items.length === 0) {

            itemStep.style.display =
                "none";

            noReceiptItems.style.display =
                "flex";

            return;

        }


        noReceiptItems.style.display =
            "none";


        itemStep.style.display =
            "flex";


        await renderReceiptItems();

    }
);



/* =========================================================
   GET RECEIPT ITEMS
========================================================= */

function getReceiptItems(receipt) {

    if (
        !Array.isArray(
            receipt.items
        )
    ) {

        return [];

    }


    return receipt.items
        .map(
            (item, index) => ({

                index,

                name:
                    item.name ||
                    item.productName ||
                    `Product ${index + 1}`,

                quantity:
                    Number(
                        item.quantity
                    ) || 1,

                price:
                    Number(
                        item.price
                    ) || 0

            })
        );

}



/* =========================================================
   CHECK IF WARRANTY ALREADY EXISTS
========================================================= */

function hasExistingWarranty(
    itemName
) {

    if (!selectedReceipt) {
        return false;
    }


    return warranties.some(
        warranty =>
            warranty.receiptId ===
                selectedReceipt.id &&
            warranty.productName
                .trim()
                .toLowerCase() ===
                itemName
                    .trim()
                    .toLowerCase()
    );

}



/* =========================================================
   RENDER ITEMS
========================================================= */

async function renderReceiptItems() {

    const items =
        getReceiptItems(
            selectedReceipt
        );


    receiptItems.innerHTML =
        "";


    items.forEach(
        item => {

            const alreadyAdded =
                hasExistingWarranty(
                    item.name
                );


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "receipt-item-card";


            if (alreadyAdded) {
                card.classList.add(
                    "already-added"
                );
            }


            const price =
                item.price > 0
                    ? `₹${item.price.toLocaleString("en-IN")}`
                    : "Price not available";


            card.innerHTML = `

                <div class="receipt-item-icon">

                    ${
                        alreadyAdded
                            ? "✓"
                            : "♢"
                    }

                </div>


                <div class="receipt-item-details">

                    <strong>
                        ${escapeHTML(
                            item.name
                        )}
                    </strong>

                    <span>
                        Qty: ${item.quantity}
                        &nbsp; • &nbsp;
                        ${price}
                    </span>

                </div>


                ${
                    alreadyAdded
                        ? `
                            <div class="receipt-item-status">
                                Added
                            </div>
                          `
                        : `
                            <div class="receipt-item-status"
                                 style="color:#2853b8;">
                                Select
                            </div>
                          `
                }

            `;


            if (!alreadyAdded) {

                card.addEventListener(
                    "click",
                    () => {

                        selectItem(item);

                    }
                );

            }


            receiptItems.appendChild(
                card
            );

        }
    );

}



/* =========================================================
   SELECT ITEM
========================================================= */

function selectItem(item) {

    selectedItem =
        item;


    document
        .querySelectorAll(
            ".receipt-item-card"
        )
        .forEach(
            card => {

                card.classList.remove(
                    "selected"
                );

            }
        );


    /*
       Find matching card by product name.
    */

    [
        ...document.querySelectorAll(
            ".receipt-item-card"
        )
    ].forEach(
        card => {

            const name =
                card
                    .querySelector(
                        ".receipt-item-details strong"
                    )
                    ?.textContent
                    ?.trim();


            if (
                name ===
                item.name
            ) {

                card.classList.add(
                    "selected"
                );

            }

        }
    );


    selectedProductName.textContent =
        item.name;


    warrantyDuration.value =
        "";


    customDurationBox.style.display =
        "none";


    customDurationValue.value =
        "";


    expiryPreview.style.display =
        "none";


    /*
       If AI had already detected warranty
       information in the receipt, use it
       as a suggestion.
    */

    const detected =
        getDetectedWarranty(
            selectedReceipt,
            item.name
        );


    if (
        detected &&
        detected.warrantyDuration
    ) {

        const duration =
            detected.warrantyDuration;


        const standardOptions = [
            "6 Months",
            "1 Year",
            "2 Years",
            "3 Years",
            "5 Years"
        ];


        if (
            standardOptions.includes(
                duration
            )
        ) {

            warrantyDuration.value =
                duration;

        }

        else {

            warrantyDuration.value =
                "CUSTOM";


            const match =
                duration.match(
                    /^(\d+)\s+(Months?|Years?)$/i
                );


            if (match) {

                customDurationValue.value =
                    match[1];

                customDurationUnit.value =
                    match[2]
                        .toLowerCase()
                        .startsWith("year")
                        ? "Years"
                        : "Months";


                customDurationBox.style.display =
                    "flex";

            }

        }


        updateExpiryPreview();

    }


    durationStep.style.display =
        "flex";


    durationStep.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });

}



/* =========================================================
   DETECTED WARRANTY FROM RECEIPT
========================================================= */

function getDetectedWarranty(
    receipt,
    itemName
) {

    const details =
        Array.isArray(
            receipt.warrantyDetails
        )
            ? receipt.warrantyDetails
            : [];


    return details.find(
        item => {

            const name =
                item.productName ||
                item.name ||
                "";


            return (
                name
                    .trim()
                    .toLowerCase() ===
                itemName
                    .trim()
                    .toLowerCase()
            );

        }
    ) || null;

}



/* =========================================================
   DURATION CHANGE
========================================================= */

warrantyDuration.addEventListener(
    "change",
    () => {

        if (
            warrantyDuration.value ===
            "CUSTOM"
        ) {

            customDurationBox.style.display =
                "flex";

        }

        else {

            customDurationBox.style.display =
                "none";

            customDurationValue.value =
                "";

        }


        updateExpiryPreview();

    }
);



customDurationValue.addEventListener(
    "input",
    updateExpiryPreview
);


customDurationUnit.addEventListener(
    "change",
    updateExpiryPreview
);



function updateExpiryPreview() {

    if (
        !selectedReceipt ||
        !selectedItem
    ) {

        expiryPreview.style.display =
            "none";

        return;

    }


    const duration =
        getSelectedDuration();


    if (!duration) {

        expiryPreview.style.display =
            "none";

        return;

    }


    const expiry =
        calculateExpiry(
            selectedReceipt.purchaseDate,
            duration
        );


    if (!expiry) {

        expiryPreview.style.display =
            "none";

        return;

    }


    calculatedExpiry.textContent =
        formatDate(
            expiry
        );


    expiryPreview.style.display =
        "flex";

}



/* =========================================================
   ADD WARRANTY
========================================================= */

addWarrantyBtn.addEventListener(
    "click",
    async () => {

        if (
            !selectedReceipt ||
            !selectedItem
        ) {

            alert(
                "Please select a product first."
            );

            return;

        }


        const duration =
            getSelectedDuration();


        if (!duration) {

            alert(
                "Please select a warranty duration."
            );

            return;

        }


        const expiry =
            calculateExpiry(
                selectedReceipt.purchaseDate,
                duration
            );


        if (!expiry) {

            alert(
                "Unable to calculate warranty expiry date."
            );

            return;

        }


        addWarrantyBtn.disabled =
            true;

        addWarrantyBtn.textContent =
            "Saving...";


        try {

            const warrantyData = {

                productName:
                    selectedItem.name,

                storeName:
                    selectedReceipt.storeName ||
                    "",

                purchaseDate:
                    toISODate(
                        selectedReceipt.purchaseDate
                    ),

                warrantyDuration:
                    duration,

                warrantyExpiryDate:
                    toISODate(
                        expiry
                    ),

                status:
                    getWarrantyStatus(
                        expiry
                    ),

                receiptId:
                    selectedReceipt.id,

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


            await loadWarranties();


            showWarrantyAction(
                "Warranty added successfully.",
                "success"
            );


            /*
               Ask whether another item should
               be added from the same receipt.
            */

            anotherItemQuestion.textContent =
                `Do you want to add warranty for another item from ${selectedReceipt.storeName || "this store"}?`;


            anotherItemBox.style.display =
                "flex";


            durationStep.style.display =
                "none";


            selectedItem = null;


            await renderReceiptItems();


        }

        catch (error) {

            console.error(
                "Warranty save error:",
                error
            );


            alert(
                "Unable to save warranty.\n\n" +
                error.message
            );

        }

        finally {

            addWarrantyBtn.disabled =
                false;

            addWarrantyBtn.textContent =
                "Add Warranty";

        }

    }
);



/* =========================================================
   YES - ADD ANOTHER
========================================================= */

yesAnotherItemBtn.addEventListener(
    "click",
    async () => {

        anotherItemBox.style.display =
            "none";


        await renderReceiptItems();


        itemStep.style.display =
            "flex";


        itemStep.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });

    }
);



/* =========================================================
   NO - DONE
========================================================= */

noAnotherItemBtn.addEventListener(
    "click",
    () => {

        anotherItemBox.style.display =
            "none";


        resetItemSelection();


        renderReceiptItems();


        warrantyRecords.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }
);



/* =========================================================
   RESET ITEM SELECTION
========================================================= */

function resetItemSelection() {

    selectedItem = null;


    durationStep.style.display =
        "none";


    warrantyDuration.value =
        "";


    customDurationValue.value =
        "";


    customDurationBox.style.display =
        "none";


    expiryPreview.style.display =
        "none";


    document
        .querySelectorAll(
            ".receipt-item-card"
        )
        .forEach(
            card =>
                card.classList.remove(
                    "selected"
                )
        );

}



/* =========================================================
   LOAD WARRANTIES
========================================================= */

async function loadWarranties() {

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


        warranties = [];


        snapshot.forEach(
            warrantyDoc => {

                const data =
                    warrantyDoc.data();


                warranties.push({

                    id:
                        warrantyDoc.id,

                    ...data,

                    status:
                        getWarrantyStatus(
                            data.warrantyExpiryDate
                        )

                });

            }
        );


        renderStats();

        renderWarrantyTable();

    }

    catch (error) {

        console.error(
            "Warranty loading error:",
            error
        );

    }

}



/* =========================================================
   STATS
========================================================= */

function renderStats() {

    let active = 0;

    let expiring = 0;

    let expired = 0;


    warranties.forEach(
        warranty => {

            if (
                warranty.status ===
                "Active"
            ) {

                active++;

            }

            else if (
                warranty.status ===
                "Expiring Soon"
            ) {

                expiring++;

            }

            else if (
                warranty.status ===
                "Expired"
            ) {

                expired++;

            }

        }
    );


    activeWarrantyCount.textContent =
        active;

    expiringWarrantyCount.textContent =
        expiring;

    expiredWarrantyCount.textContent =
        expired;

    totalWarrantyCount.textContent =
        warranties.length;




    const reminderWarranties =
        warranties.filter(
            warranty => {

                const expiry =
                    normalizeDate(
                        warranty.warrantyExpiryDate
                    );

                if (!expiry) {
                    return false;
                }

                const today =
                    new Date();

                today.setHours(0, 0, 0, 0);

                const daysLeft =
                    Math.round(
                        (expiry - today) /
                        (1000 * 60 * 60 * 24)
                    );

                return [30, 7, 1].includes(daysLeft);

            }
        );


    if (reminderWarranties.length > 0) {

        warrantyReminderText.textContent =
            `${reminderWarranties.length} warranty reminder(s) are due today. Reminders appear in your notifications.`;

    }

    else {

        warrantyReminderText.textContent =
            "No warranty reminders are due today.";

    }


}



/* =========================================================
   TABLE
========================================================= */

function renderWarrantyTable() {

    const filter =
        warrantyFilter.value;


    let filtered =
        [...warranties];


    if (filter !== "all") {

        const statusMap = {

            active:
                "Active",

            expiring:
                "Expiring Soon",

            expired:
                "Expired"

        };


        filtered =
            filtered.filter(
                warranty =>
                    warranty.status ===
                    statusMap[filter]
            );

    }


    filtered.sort(
        (a, b) => {

            const first =
                normalizeDate(
                    a.warrantyExpiryDate
                );

            const second =
                normalizeDate(
                    b.warrantyExpiryDate
                );


            return (
                (first?.getTime() || 0) -
                (second?.getTime() || 0)
            );

        }
    );


    warrantyTableBody.innerHTML =
        "";


    if (filtered.length === 0) {

        warrantyEmpty.style.display =
            "block";

        return;

    }


    warrantyEmpty.style.display =
        "none";


    filtered.forEach(
        warranty => {

            const row =
                document.createElement(
                    "tr"
                );


const expiryDate = new Date(
    warranty.warrantyExpiryDate + "T00:00:00"
);

const today = new Date();
today.setHours(0, 0, 0, 0);

const daysLeft = Math.round(
    (expiryDate - today) / (1000 * 60 * 60 * 24)
);

let reminderMessage = "";

if (daysLeft === 15) {
    reminderMessage = "Reminder: Expires in 15 days";
} else if (daysLeft === 7) {
    reminderMessage = "Reminder: Expires in 7 days";
} else if (daysLeft === 1) {
    reminderMessage = "Reminder: Expires tomorrow";
} else if (daysLeft === 0) {
    reminderMessage = "Warranty expires today!";
}



            row.innerHTML = `

                <td>

                    <div class="warranty-product-cell">

                        <div class="warranty-product-icon">
                            ♢
                        </div>

                        <div class="warranty-product-info">

                            <strong>
                                ${escapeHTML(
                                    warranty.productName
                                )}
                            </strong>

                            <small>
                                ${escapeHTML(
                                    warranty.warrantyDuration ||
                                    "Warranty"
                                )}
                            </small>

                        </div>

                    </div>

                </td>


                <td>
                    ${escapeHTML(
                        warranty.storeName ||
                        "—"
                    )}
                </td>


                <td>
                    ${formatDate(
                        warranty.purchaseDate
                    )}
                </td>



<td>
    ${formatDate(warranty.warrantyExpiryDate)}
    ${reminderMessage
        ? `<br><small>${escapeHTML(reminderMessage)}</small>`
        : ""}
</td>



                <td>
                    ${getStatusBadge(
                        warranty.status
                    )}
                </td>


                <td>

                    <div class="warranty-action-group">

                        <button
                            type="button"
                            class="warranty-edit-btn"
                            data-edit="${warranty.id}">
                            Edit
                        </button>

                        <button
                            type="button"
                            class="warranty-delete-btn"
                            data-delete="${warranty.id}">
                            Delete
                        </button>

                    </div>

                </td>

            `;


            warrantyTableBody.appendChild(
                row
            );

        }
    );

}



/* =========================================================
   STATUS BADGE
========================================================= */

function getStatusBadge(status) {

    let className =
        "warranty-status-active";


    if (
        status === "Expiring Soon"
    ) {

        className =
            "warranty-status-expiring";

    }

    else if (
        status === "Expired"
    ) {

        className =
            "warranty-status-expired";

    }


    return `
        <span class="warranty-status-badge ${className}">
            ${escapeHTML(status)}
        </span>
    `;

}



/* =========================================================
   TABLE ACTIONS
========================================================= */

document.addEventListener(
    "click",
    async event => {

        const editButton =
            event.target.closest(
                "[data-edit]"
            );


        const deleteButton =
            event.target.closest(
                "[data-delete]"
            );


        if (editButton) {

            editWarranty(
                editButton.dataset.edit
            );

        }


        if (deleteButton) {

            await deleteWarranty(
                deleteButton.dataset.delete
            );

        }

    }
);


editWarrantyForm?.addEventListener(
    "submit",
    saveWarrantyEdits
);


closeEditWarrantyModal?.addEventListener(
    "click",
    closeEditWarrantyDialog
);


cancelEditWarranty?.addEventListener(
    "click",
    closeEditWarrantyDialog
);


editWarrantyModal?.addEventListener(
    "click",
    event => {

        if (event.target === editWarrantyModal) {

            closeEditWarrantyDialog();

        }

    }
);


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            editWarrantyModal?.style.display === "flex"
        ) {

            closeEditWarrantyDialog();

        }

    }
);



/* =========================================================
   EDIT
========================================================= */

function setEditWarrantyMessage(
    message,
    type = ""
) {

    if (!editWarrantyMessage) {
        return;
    }

    editWarrantyMessage.textContent =
        message;

    editWarrantyMessage.className =
        `profile-message ${type}`.trim();

}



function editWarranty(id) {

    const warranty =
        warranties.find(
            item =>
                item.id === id
        );


    if (!warranty || !editWarrantyModal) {
        return;
    }


    editingWarrantyId =
        id;

    editProductName.value =
        warranty.productName || "";

    editStoreName.value =
        warranty.storeName || "";

    editPurchaseDate.value =
        toISODate(
            warranty.purchaseDate
        );

    editWarrantyDuration.value =
        warranty.warrantyDuration || "";

    editWarrantyExpiry.value =
        toISODate(
            warranty.warrantyExpiryDate
        );

    setEditWarrantyMessage("");

    saveWarrantyEdit.disabled =
        false;

    saveWarrantyEdit.textContent =
        "Save Changes";

    editWarrantyModal.style.display =
        "flex";


    requestAnimationFrame(
        () => {

            editProductName.focus();

        }
    );

}



function closeEditWarrantyDialog() {

    if (!editWarrantyModal) {
        return;
    }

    editWarrantyModal.style.display =
        "none";

    editingWarrantyId =
        null;

    setEditWarrantyMessage("");

}



/* =========================================================
   UPDATE
========================================================= */

async function saveWarrantyEdits(event) {

    event.preventDefault();


    if (
        !editingWarrantyId ||
        !currentUser
    ) {
        return;
    }


    const productName =
        editProductName.value.trim();

    const storeName =
        editStoreName.value.trim();

    const purchaseValue =
        editPurchaseDate.value;

    const duration =
        editWarrantyDuration.value.trim();

    const expiryValue =
        editWarrantyExpiry.value;


    if (!productName) {

        setEditWarrantyMessage(
            "Please enter the product name.",
            "error"
        );

        editProductName.focus();

        return;

    }


    if (!purchaseValue || !expiryValue) {

        setEditWarrantyMessage(
            "Please enter both the purchase and expiry dates.",
            "error"
        );

        return;

    }


    const purchaseDate =
        normalizeDate(purchaseValue);

    const expiryDate =
        normalizeDate(expiryValue);


    if (
        !purchaseDate ||
        !expiryDate ||
        expiryDate < purchaseDate
    ) {

        setEditWarrantyMessage(
            "The expiry date must be on or after the purchase date.",
            "error"
        );

        editWarrantyExpiry.focus();

        return;

    }


    if (!duration) {

        setEditWarrantyMessage(
            "Please enter a warranty duration.",
            "error"
        );

        editWarrantyDuration.focus();

        return;

    }


    saveWarrantyEdit.disabled =
        true;

    saveWarrantyEdit.textContent =
        "Saving...";

    setEditWarrantyMessage("");


    try {

        await updateDoc(
            doc(
                db,
                "users",
                currentUser.uid,
                "warranties",
                editingWarrantyId
            ),
            {

                productName:
                    productName,

                storeName:
                    storeName,

                purchaseDate:
                    toISODate(
                        purchaseDate
                    ),

                warrantyDuration:
                    duration,

                warrantyExpiryDate:
                    toISODate(
                        expiryDate
                    ),

                status:
                    getWarrantyStatus(
                        expiryDate
                    ),

                updatedAt:
                    serverTimestamp()

            }
        );


        await loadWarranties();

        closeEditWarrantyDialog();

        showWarrantyAction(
            "Warranty updated successfully.",
            "success"
        );

    }

    catch (error) {

        console.error(
            "Warranty update error:",
            error
        );

        setEditWarrantyMessage(
            "Unable to update this warranty. " +
            error.message,
            "error"
        );

    }

    finally {

        saveWarrantyEdit.disabled =
            false;

        saveWarrantyEdit.textContent =
            "Save Changes";

    }

}



/* =========================================================
   DELETE
========================================================= */

async function deleteWarranty(id) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this warranty?"
        );


    if (!confirmed) {
        return;
    }


    try {

        await deleteDoc(
            doc(
                db,
                "users",
                currentUser.uid,
                "warranties",
                id
            )
        );


        await loadWarranties();


        /*
           Refresh item status if a receipt
           is currently selected.
        */

        if (selectedReceipt) {
            await renderReceiptItems();
        }

    }

    catch (error) {

        console.error(
            "Warranty delete error:",
            error
        );


        alert(
            "Unable to delete warranty.\n\n" +
            error.message
        );

    }

}



/* =========================================================
   FILTER
========================================================= */

warrantyFilter.addEventListener(
    "change",
    renderWarrantyTable
);



/* =========================================================
   PROFILE
========================================================= */

profileButton?.addEventListener(
    "click",
    () => {

        profileModal.style.display =
            "flex";

        profileEmailInput.value =
            currentUser?.email || "";

    }
);


closeProfileModal?.addEventListener(
    "click",
    () => {

        profileModal.style.display =
            "none";

    }
);


profileModal?.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            profileModal
        ) {

            profileModal.style.display =
                "none";

        }

    }
);


saveProfile?.addEventListener(
    "click",
    () => {

        const name =
            profileNameInput.value.trim();


        if (!name) {

            profileMessage.textContent =
                "Please enter your name.";

            profileMessage.style.color =
                "#d92d20";

            return;

        }


        if (profileName) {
            profileName.textContent =
                name;
        }


        profileMessage.textContent =
            "Profile updated.";

        profileMessage.style.color =
            "#16834b";

    }
);



/* =========================================================
   AUTH
========================================================= */

onAuthStateChanged(
    auth,
    async user => {

        if (!user) {

            const next =
                window.location.pathname.split("/").pop() +
                window.location.search +
                window.location.hash;

            window.location.href =
                "loginpg.html?next=" + encodeURIComponent(next);

            return;

        }


        currentUser =
            user;


        if (profileAvatar) {
            profileAvatar.textContent =
                user.email
                    ?.charAt(0)
                    ?.toUpperCase() ||
                "U";
        }

        if (profileLargeAvatar) {
            profileLargeAvatar.textContent =
                user.email
                    ?.charAt(0)
                    ?.toUpperCase() ||
                "U";
        }

        if (profileName) {
            profileName.textContent =
                user.displayName ||
                "User";
        }

        if (profileNameInput) {
            profileNameInput.value =
                user.displayName || "";
        }

        if (profileEmailInput) {
            profileEmailInput.value =
                user.email || "";
        }


        await loadWarranties();

        await loadReceipts();

    }
);
