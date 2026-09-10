// ==========================================
// SHOPIX AI RECEIPT SCANNER
// ==========================================

import {
    receiptModel,
    saveReceiptToFirestore
} from "../firebase.js";


// ==========================================
// GET ELEMENTS
// ==========================================

const receiptPreview =
    document.getElementById(
        "receiptPreview"
    );

const progressBar =
    document.getElementById(
        "progressBar"
    );

const progressText =
    document.getElementById(
        "progressText"
    );

const processText =
    document.getElementById(
        "processText"
    );

const processTitle =
    document.getElementById(
        "processTitle"
    );

const scanArea =
    document.getElementById(
        "scanArea"
    );

const resultArea =
    document.getElementById(
        "resultArea"
    );


const storeInput =
    document.getElementById(
        "storeInput"
    );

const dateInput =
    document.getElementById(
        "dateInput"
    );

const amountInput =
    document.getElementById(
        "amountInput"
    );

const categorySelect =
    document.getElementById(
        "categorySelect"
    );


const warrantyTitle =
    document.getElementById(
        "warrantyTitle"
    );

const warrantyText =
    document.getElementById(
        "warrantyText"
    );

const warrantyStatus =
    document.getElementById(
        "warrantyStatus"
    );


const itemsList =
    document.getElementById(
        "itemsList"
    );


const saveBtn =
    document.getElementById(
        "saveBtn"
    );

const scanAgainBtn =
    document.getElementById(
        "scanAgainBtn"
    );

const changeReceiptBtn =
    document.getElementById(
        "changeReceiptBtn"
    );


// ==========================================
// GET UPLOADED RECEIPT
// ==========================================

const fileData =
    sessionStorage.getItem(
        "shopixReceiptFile"
    );

const fileName =
    sessionStorage.getItem(
        "shopixReceiptName"
    );

const fileType =
    sessionStorage.getItem(
        "shopixReceiptType"
    );


// ==========================================
// CHECK RECEIPT
// ==========================================

if (!fileData) {

    alert(
        "No receipt found. Please upload a receipt first."
    );

    window.location.href =
        "upload.html";

}


// ==========================================
// SHOW RECEIPT
// ==========================================

function showUploadedReceipt() {

    receiptPreview.innerHTML = "";


    if (
        fileType ===
        "application/pdf"
    ) {

        const pdf =
            document.createElement(
                "iframe"
            );

        pdf.src =
            fileData;

        pdf.title =
            fileName ||
            "Uploaded Receipt";

        receiptPreview.appendChild(
            pdf
        );

    }

    else {

        const image =
            document.createElement(
                "img"
            );

        image.src =
            fileData;

        image.alt =
            "Uploaded Receipt";

        receiptPreview.appendChild(
            image
        );

    }

}


// ==========================================
// PROGRESS
// ==========================================

let progress =
    0;

let progressTimer =
    null;


const messages = [

    "Preparing receipt for AI...",

    "Reading receipt text...",

    "Detecting store information...",

    "Reading purchase date...",

    "Identifying purchased items...",

    "Calculating total amount...",

    "Checking warranty information..."

];


function startProgress() {

    progress = 0;

    progressBar.style.width =
        "0%";

    progressText.textContent =
        "0%";


    progressTimer =
        setInterval(
            function () {

                if (
                    progress >= 90
                ) {

                    clearInterval(
                        progressTimer
                    );

                    return;

                }


                progress += 5;


                progressBar.style.width =
                    progress + "%";


                progressText.textContent =
                    progress + "%";


                const index =
                    Math.min(

                        Math.floor(
                            progress / 15
                        ),

                        messages.length - 1

                    );


                processText.textContent =
                    messages[index];

            },

            500
        );

}


// ==========================================
// CREATE GEMINI FILE PART
// ==========================================

function createReceiptPart() {

    const commaIndex =
        fileData.indexOf(",");


    if (
        commaIndex === -1
    ) {

        throw new Error(
            "Invalid receipt data."
        );

    }


    const base64 =
        fileData.substring(
            commaIndex + 1
        );


    return {

        inlineData: {

            mimeType:
                fileType,

            data:
                base64

        }

    };

}


// ==========================================
// AI PROMPT
// ==========================================

const prompt = `

You are SHOPIX AI Receipt Scanner.

Analyze the ACTUAL uploaded receipt.

Do not use demo information.

Do not invent information.

Extract only information that is visible
or clearly readable on the receipt.

Return:

- storeName
- purchaseDate in YYYY-MM-DD format
- totalAmount as a number
- category
- all visible purchased items
- warranty information

Allowed categories:

Food
Grocery
Shopping
Electronics
Clothing
Travel
Medical
Other

For each purchased item return:

name
quantity
price

For warranty:

warrantyDetected = true only if warranty
information is actually visible or clearly
mentioned on the receipt.

If warranty information is not present:

warrantyDetected = false

and warrantyDetails should be:

"No warranty information found."

If the purchase date is unavailable,
return an empty string.

If the store name is unavailable,
return an empty string.

If there are no clearly identifiable items,
return an empty items array.

Be accurate and do not guess.

`;


// ==========================================
// ANALYZE RECEIPT
// ==========================================

async function analyzeReceipt() {

    try {

        startProgress();


        processTitle.textContent =
            "Scanning Receipt";


        processText.textContent =
            "AI is analyzing your receipt...";


        const receiptPart =
            createReceiptPart();


        const result =
            await receiptModel.generateContent([

                prompt,

                receiptPart

            ]);


        const response =
            result.response;


        const responseText =
            response.text();


        console.log(
            "SHOPIX AI RESPONSE:",
            responseText
        );


        const receiptData =
            JSON.parse(
                responseText
            );


        console.log(
            "EXTRACTED RECEIPT:",
            receiptData
        );


        // Stop progress

        if (
            progressTimer
        ) {

            clearInterval(
                progressTimer
            );

        }


        progressBar.style.width =
            "100%";

        progressText.textContent =
            "100%";

        processText.textContent =
            "Receipt analysis completed!";


        // Fill result

        fillReceiptData(
            receiptData
        );


        // Show result

        setTimeout(
            function () {

                processTitle.textContent =
                    "Receipt Analysis Complete";


                scanArea.style.display =
                    "none";


                resultArea.classList.add(
                    "show"
                );

            },

            700
        );


    }

    catch (error) {

        console.error(
            "SHOPIX AI ERROR:",
            error
        );


        if (
            progressTimer
        ) {

            clearInterval(
                progressTimer
            );

        }


        processTitle.textContent =
            "Analysis Failed";


        processText.textContent =
            "Unable to analyze this receipt.";


        progressText.textContent =
            "Error";


        progressBar.style.width =
            "100%";


        alert(
            "AI scanning failed.\n\nOpen F12 → Console and check the error."
        );

    }

}


// ==========================================
// FILL RECEIPT DATA
// ==========================================

function fillReceiptData(
    data
) {

    storeInput.value =
        data.storeName || "";


    dateInput.value =
        data.purchaseDate || "";


    amountInput.value =
        data.totalAmount ?? "";


    categorySelect.value =
        data.category || "Other";


    // Warranty

    if (
        data.warrantyDetected
    ) {

        warrantyTitle.textContent =
            "Warranty Detected";


        warrantyText.textContent =
            data.warrantyDetails ||
            "Warranty information was detected.";


        warrantyStatus.textContent =
            "Detected";

    }

    else {

        warrantyTitle.textContent =
            "No Warranty Detected";


        warrantyText.textContent =
            data.warrantyDetails ||
            "No warranty information found.";


        warrantyStatus.textContent =
            "Not Detected";

    }


    // Items

    renderItems(
        data.items || []
    );


    // Store data temporarily

    window.shopixReceiptData =
        data;

}


// ==========================================
// SHOW ITEMS
// ==========================================

function renderItems(
    items
) {

    itemsList.innerHTML = "";


    if (
        items.length === 0
    ) {

        itemsList.innerHTML =
            `<p class="empty-items">
                No clearly identifiable items found.
            </p>`;

        return;

    }


    items.forEach(
        function (item) {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "item-row";


            row.innerHTML = `

                <span>
                    ${escapeHTML(item.name)}
                    × ${Number(item.quantity) || 1}
                </span>

                <span class="item-price">
                    ₹${Number(item.price).toLocaleString("en-IN")}
                </span>

            `;


            itemsList.appendChild(
                row
            );

        }
    );

}


// ==========================================
// SAFE HTML
// ==========================================

function escapeHTML(
    value
) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// ==========================================
// SAVE RECEIPT
// ==========================================

saveBtn.addEventListener(
    "click",
    async function () {

        try {

            if (
                !window.shopixReceiptData
            ) {

                alert(
                    "Receipt data is not available."
                );

                return;

            }


            saveBtn.disabled = true;

            saveBtn.textContent =
                "Saving...";


            const data = {

                ...window.shopixReceiptData,

                storeName:
                    storeInput.value.trim(),

                purchaseDate:
                    dateInput.value,

                totalAmount:
                    Number(
                        amountInput.value
                    ),

                category:
                    categorySelect.value

            };


            const receiptId =
                await saveReceiptToFirestore(
                    data
                );


            console.log(
                "Receipt saved:",
                receiptId
            );


            alert(
                "Receipt saved successfully!"
            );


            sessionStorage.removeItem(
                "shopixReceiptFile"
            );

            sessionStorage.removeItem(
                "shopixReceiptName"
            );

            sessionStorage.removeItem(
                "shopixReceiptType"
            );


            window.location.href =
                "dashboard.html";

        }

        catch (error) {

            console.error(
                "SAVE ERROR:",
                error
            );


            alert(
                "Receipt could not be saved.\n\nCheck F12 → Console."
            );


            saveBtn.disabled = false;

            saveBtn.textContent =
                "✓ Save Receipt";

        }

    }
);


// ==========================================
// SCAN AGAIN
// ==========================================

scanAgainBtn.addEventListener(
    "click",
    function () {

        window.location.href =
            "upload.html";

    }
);


changeReceiptBtn.addEventListener(
    "click",
    function () {

        window.location.href =
            "upload.html";

    }
);


// ==========================================
// START
// ==========================================

showUploadedReceipt();

analyzeReceipt();