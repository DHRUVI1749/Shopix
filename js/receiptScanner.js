// ==========================================
// SHOPIX - RECEIPT SCANNER
// UPLOAD + PREVIEW + CAMERA + AI + MANUAL + FIRESTORE
// ==========================================

import { auth, db } from "./firebase.js";

import { model } from "./ai.js";

import {
    collection,
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


console.log("Firebase connected successfully!");


// ==========================================
// GLOBAL DATA
// ==========================================

let currentExtractedData = null;

let isManualMode = false;


// ==========================================
// ELEMENTS
// ==========================================

const fileInput =
    document.getElementById("receiptFileInput");

const previewImage =
    document.getElementById("receiptPreview");

const noPreviewText =
    document.getElementById("noPreviewText");

const manualPreviewText =
    document.getElementById("manualPreviewText");

const previewStatus =
    document.getElementById("previewStatus");

const scanButton =
    document.getElementById("scanBtn");

const captureButton =
    document.getElementById("captureBtn");

const manualReceiptButton =
    document.getElementById("manualReceiptBtn");

const saveReceiptButton =
    document.getElementById("saveReceiptBtn");

const addItemButton =
    document.getElementById("addItemBtn");

const itemsList =
    document.getElementById("itemsList");

const noItemsMessage =
    document.getElementById("noItemsMessage");


// ==========================================
// FILE UPLOAD
// ==========================================

fileInput.addEventListener("change", function () {

    const file = fileInput.files[0];

    if (!file) {

        resetPreview();

        return;
    }


    // Maximum 10 MB

    if (file.size > 10 * 1024 * 1024) {

        alert(
            "Receipt image must be less than 10 MB."
        );

        fileInput.value = "";

        resetPreview();

        return;
    }


    // Allowed image formats

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];


    if (!allowedTypes.includes(file.type)) {

        alert(
            "Please select a JPG, PNG or WEBP image."
        );

        fileInput.value = "";

        resetPreview();

        return;
    }


    isManualMode = false;

    showPreview(file);

});


// ==========================================
// SHOW RECEIPT PREVIEW
// ==========================================

function showPreview(file) {

    const imageUrl =
        URL.createObjectURL(file);


    previewImage.src =
        imageUrl;


    previewImage.style.display =
        "block";


    noPreviewText.style.display =
        "none";


    manualPreviewText.style.display =
        "none";


    previewStatus.textContent =
        "Receipt selected";


    scanButton.disabled =
        false;


    console.log(
        "Receipt selected:",
        file.name
    );

}


// ==========================================
// RESET PREVIEW
// ==========================================

function resetPreview() {

    previewImage.src = "";

    previewImage.style.display =
        "none";


    noPreviewText.style.display =
        "flex";


    manualPreviewText.style.display =
        "none";


    previewStatus.textContent =
        "No receipt";


    scanButton.disabled =
        true;


    isManualMode = false;

}


// ==========================================
// MANUAL RECEIPT
// ==========================================

manualReceiptButton.addEventListener(
    "click",
    function () {

        isManualMode = true;


        // No image required

        fileInput.value = "";


        previewImage.src = "";

        previewImage.style.display =
            "none";


        noPreviewText.style.display =
            "none";


        manualPreviewText.style.display =
            "flex";


        previewStatus.textContent =
            "Manual entry";


        scanButton.disabled =
            true;


        // Create empty receipt data

        currentExtractedData = {

            storeName: "",

            purchaseDate: "",

            totalAmount: 0,

            currency: "INR",

            category: "",

            items: []

        };


        showManualForm();


        console.log(
            "Manual receipt mode enabled."
        );

    }
);


// ==========================================
// SHOW MANUAL FORM
// ==========================================

function showManualForm() {

    const section =
        document.getElementById(
            "extractedDataSection"
        );


    const title =
        document.getElementById(
            "dataSectionTitle"
        );


    const description =
        document.getElementById(
            "dataSectionDescription"
        );


    if (title) {

        title.textContent =
            "Add Receipt Manually";

    }


    if (description) {

        description.textContent =
            "Enter your receipt details and save them to SHOPIX.";

    }


    // Reset fields

    document.getElementById(
        "storeName"
    ).value = "";


    document.getElementById(
        "purchaseDate"
    ).value = "";


    document.getElementById(
        "totalAmount"
    ).value = "";


    document.getElementById(
        "currency"
    ).value = "INR";


    document.getElementById(
        "category"
    ).value = "";


    itemsList.innerHTML = "";


    noItemsMessage.style.display =
        "block";


    if (section) {

        section.style.display =
            "block";


        section.scrollIntoView({

            behavior: "smooth",

            block: "start"

        });

    }

}


// ==========================================
// ADD MANUAL ITEM
// ==========================================

addItemButton.addEventListener(
    "click",
    function () {

        addManualItemRow();

    }
);


// ==========================================
// CREATE MANUAL ITEM ROW
// ==========================================

function addManualItemRow(
    item = {}
) {

    noItemsMessage.style.display =
        "none";


    const row =
        document.createElement("div");


    row.className =
        "manual-item-row";


    // Item name

    const nameInput =
        document.createElement("input");

    nameInput.type =
        "text";

    nameInput.placeholder =
        "Item name";

    nameInput.className =
        "manual-item-name";

    nameInput.value =
        item.name || "";


    // Quantity

    const quantityInput =
        document.createElement("input");

    quantityInput.type =
        "number";

    quantityInput.min =
        "1";

    quantityInput.step =
        "1";

    quantityInput.placeholder =
        "Qty";

    quantityInput.className =
        "manual-item-quantity";

    quantityInput.value =
        item.quantity || 1;


    // Price

    const priceInput =
        document.createElement("input");

    priceInput.type =
        "number";

    priceInput.min =
        "0";

    priceInput.step =
        "0.01";

    priceInput.placeholder =
        "Price";

    priceInput.className =
        "manual-item-price";

    priceInput.value =
        item.price || "";


    // Remove button

    const removeButton =
        document.createElement("button");

    removeButton.type =
        "button";

    removeButton.className =
        "remove-item-btn";

    removeButton.textContent =
        "×";


    removeButton.addEventListener(
        "click",
        function () {

            row.remove();

            if (
                itemsList.children.length === 0
            ) {

                noItemsMessage.style.display =
                    "block";

            }

        }
    );


    row.appendChild(
        nameInput
    );

    row.appendChild(
        quantityInput
    );

    row.appendChild(
        priceInput
    );

    row.appendChild(
        removeButton
    );


    itemsList.appendChild(
        row
    );

}


// ==========================================
// GET MANUAL ITEMS
// ==========================================

function getManualItems() {

    const rows =
        itemsList.querySelectorAll(
            ".manual-item-row"
        );


    const items = [];


    rows.forEach(
        function (row) {

            const name =
                row.querySelector(
                    ".manual-item-name"
                ).value.trim();


            const quantity =
                Number(
                    row.querySelector(
                        ".manual-item-quantity"
                    ).value
                ) || 1;


            const price =
                Number(
                    row.querySelector(
                        ".manual-item-price"
                    ).value
                ) || 0;


            // Only save if item name exists

            if (name) {

                items.push({

                    name: name,

                    quantity: quantity,

                    price: price

                });

            }

        }
    );


    return items;

}


// ==========================================
// SAVE RECEIPT TO FIRESTORE
// ==========================================

saveReceiptButton.addEventListener(
    "click",
    async function () {

        // ==========================================
        // CHECK LOGIN
        // ==========================================

        const user =
            auth.currentUser;


        if (!user) {

            alert(
                "Please login first."
            );

            return;
        }


        // ==========================================
        // GET FORM DATA
        // ==========================================

        const storeName =
            document.getElementById(
                "storeName"
            ).value.trim();


        const purchaseDate =
            document.getElementById(
                "purchaseDate"
            ).value;


        const totalAmount =
            Number(
                document.getElementById(
                    "totalAmount"
                ).value
            );


        const category =
            document.getElementById(
                "category"
            ).value;


        const currency =
            document.getElementById(
                "currency"
            ).value;


        // ==========================================
        // VALIDATION
        // ==========================================

        if (!storeName) {

            alert(
                "Please enter the store name."
            );

            return;
        }


        if (!purchaseDate) {

            alert(
                "Please select the purchase date."
            );

            return;
        }


        if (
            isNaN(totalAmount) ||
            totalAmount <= 0
        ) {

            alert(
                "Please enter a valid total amount."
            );

            return;
        }


        if (!currency) {

            alert(
                "Please select a currency."
            );

            return;
        }


        if (!category) {

            alert(
                "Please select a category."
            );

            return;
        }


        // ==========================================
        // GET ITEMS
        // ==========================================

        let items = [];


        if (isManualMode) {

            items =
                getManualItems();

        } else {

            items =
                currentExtractedData?.items || [];

        }


        // ==========================================
        // DISABLE BUTTON
        // ==========================================

        saveReceiptButton.disabled =
            true;

        saveReceiptButton.textContent =
            "Saving...";


        try {

            // ==========================================
            // CREATE RECEIPT ID
            // ==========================================

            const receiptRef =
                doc(
                    collection(
                        db,
                        "users",
                        user.uid,
                        "receipts"
                    )
                );


            const receiptId =
                receiptRef.id;


            // ==========================================
            // SAVE RECEIPT
            // ==========================================

            await setDoc(

                receiptRef,

                {

                    storeName:
                        storeName,

                    purchaseDate:
                        purchaseDate,

                    totalAmount:
                        totalAmount,

                    currency:
                        currency,

                    category:
                        category,

                    items:
                        items,

                    createdAt:
                        serverTimestamp()

                }

            );


            console.log(
                "Receipt saved successfully:",
                receiptId
            );


            console.log(
                "Saved currency:",
                currency
            );


            // ==========================================
            // SUCCESS
            // ==========================================

            alert(
                "✅ Receipt saved successfully!"
            );


            saveReceiptButton.textContent =
                "Saved ✓";


            // Keep button disabled after save

            saveReceiptButton.disabled =
                true;


        } catch (error) {

            console.error(
                "❌ Error saving receipt:",
                error
            );


            alert(
                "Unable to save receipt. Please try again."
            );


            saveReceiptButton.disabled =
                false;


            saveReceiptButton.textContent =
                "✓ Save Receipt";

        }

    }
);


// ==========================================
// CAMERA CAPTURE
// ==========================================

captureButton.addEventListener(
    "click",
    async function () {

        // ==========================================
        // CHECK CAMERA SUPPORT
        // ==========================================

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            alert(
                "Camera capture is not supported by this browser."
            );

            return;
        }


        let stream;


        try {

            // ==========================================
            // OPEN CAMERA
            // ==========================================

            stream =
                await navigator.mediaDevices.getUserMedia({

                    video: {
                        facingMode: "environment"
                    }

                });


            // ==========================================
            // CAMERA OVERLAY
            // ==========================================

            const overlay =
                document.createElement(
                    "div"
                );


            overlay.className =
                "camera-overlay";


            // ==========================================
            // VIDEO
            // ==========================================

            const video =
                document.createElement(
                    "video"
                );


            video.autoplay =
                true;

            video.playsInline =
                true;

            video.srcObject =
                stream;


            // ==========================================
            // CAPTURE BUTTON
            // ==========================================

            const capturePhoto =
                document.createElement(
                    "button"
                );


            capturePhoto.textContent =
                "📸 Capture Photo";


            capturePhoto.className =
                "camera-capture-btn";


            // ==========================================
            // CLOSE BUTTON
            // ==========================================

            const closeCamera =
                document.createElement(
                    "button"
                );


            closeCamera.textContent =
                "✕ Close";


            closeCamera.className =
                "camera-close-btn";


            // ==========================================
            // ADD ELEMENTS
            // ==========================================

            overlay.appendChild(
                video
            );

            overlay.appendChild(
                capturePhoto
            );

            overlay.appendChild(
                closeCamera
            );


            document.body.appendChild(
                overlay
            );


            // ==========================================
            // CAPTURE PHOTO
            // ==========================================

            capturePhoto.addEventListener(
                "click",
                function () {

                    if (
                        video.videoWidth === 0 ||
                        video.videoHeight === 0
                    ) {

                        alert(
                            "Camera is not ready yet. Please try again."
                        );

                        return;
                    }


                    // Canvas

                    const canvas =
                        document.createElement(
                            "canvas"
                        );


                    canvas.width =
                        video.videoWidth;


                    canvas.height =
                        video.videoHeight;


                    const context =
                        canvas.getContext(
                            "2d"
                        );


                    context.drawImage(

                        video,

                        0,

                        0,

                        canvas.width,

                        canvas.height

                    );


                    // Convert to file

                    canvas.toBlob(

                        function (blob) {

                            if (!blob) {

                                alert(
                                    "Unable to capture receipt image."
                                );

                                return;
                            }


                            const capturedFile =
                                new File(

                                    [blob],

                                    "captured-receipt.jpg",

                                    {
                                        type: "image/jpeg"
                                    }

                                );


                            // Put file into input

                            const dataTransfer =
                                new DataTransfer();


                            dataTransfer.items.add(
                                capturedFile
                            );


                            fileInput.files =
                                dataTransfer.files;


                            // Stop camera

                            stream
                                .getTracks()
                                .forEach(
                                    function (track) {
                                        track.stop();
                                    }
                                );


                            // Remove overlay

                            overlay.remove();


                            // AI mode

                            isManualMode =
                                false;


                            // Show preview

                            showPreview(
                                capturedFile
                            );


                            console.log(
                                "Receipt captured successfully."
                            );

                        },

                        "image/jpeg",

                        0.95

                    );

                }
            );


            // ==========================================
            // CLOSE CAMERA
            // ==========================================

            closeCamera.addEventListener(
                "click",
                function () {

                    stream
                        .getTracks()
                        .forEach(
                            function (track) {
                                track.stop();
                            }
                        );


                    overlay.remove();


                    console.log(
                        "Camera closed."
                    );

                }
            );


        } catch (error) {

            console.error(
                "Camera error:",
                error
            );


            alert(
                "Unable to access camera. Please allow camera permission."
            );

        }

    }
);


// ==========================================
// AI RECEIPT SCANNING
// ==========================================

scanButton.addEventListener(
    "click",
    async function () {

        const file =
            fileInput.files[0];


        if (!file) {

            alert(
                "Please upload or capture a receipt first."
            );

            return;
        }


        // ==========================================
        // DISABLE BUTTON
        // ==========================================

        scanButton.disabled =
            true;


        const originalText =
            scanButton.textContent;


        scanButton.textContent =
            "✨ Scanning Receipt...";


        try {

            console.log(
                "Starting AI receipt scan:",
                file.name
            );


            // ==========================================
            // CONVERT IMAGE TO BASE64
            // ==========================================

            const base64Image =
                await fileToBase64(
                    file
                );


            console.log(
                "Receipt image converted successfully."
            );


            // ==========================================
            // AI PROMPT
            // ==========================================

            const prompt = `

You are SHOPIX, an AI receipt scanner.

Analyze the attached receipt image carefully.

Extract the following information:

1. Store Name
2. Purchase Date
3. Total Amount
4. Currency
5. Category
6. Items purchased

For Category, choose ONLY one of:

Food
Grocery
Shopping
Electronics
Clothing
Travel
Medical
Other

For Currency:

Identify the actual currency printed on the receipt.

Examples:

₹ or Rs or INR = INR
$ or USD = USD
€ or EUR = EUR
£ or GBP = GBP
AED or د.إ = AED
CAD = CAD
AUD = AUD

IMPORTANT:

Do NOT convert currencies.

If the receipt says $78, return:

"totalAmount": 78,
"currency": "USD"

Do NOT return:

"totalAmount": 78,
"currency": "INR"

The totalAmount must represent the original amount printed on the receipt.

Return ONLY valid JSON.

Use this exact format:

{
    "storeName": "",
    "purchaseDate": "",
    "totalAmount": 0,
    "currency": "INR",
    "category": "",
    "items": [
        {
            "name": "",
            "quantity": 1,
            "price": 0
        }
    ]
}

Rules:

- Do not add explanations.
- Do not use markdown.
- totalAmount must be a number.
- quantity must be a number.
- price must be a number.
- currency must be a currency code such as INR, USD, EUR, GBP, AED, CAD or AUD.
- Do not convert the amount to another currency.
- Read the receipt carefully.
- Do not invent information.
- If currency cannot be identified, use "Other".
- If a value cannot be identified, use an empty string or 0.

`;


            // ==========================================
            // IMAGE PART
            // ==========================================

            const imagePart = {

                inlineData: {

                    data: base64Image,

                    mimeType: file.type

                }

            };


            // ==========================================
            // SEND TO GEMINI
            // ==========================================

            const result =
                await model.generateContent([

                    prompt,

                    imagePart

                ]);


            const response =
                result.response;


            const text =
                response.text();


            console.log(
                "Gemini raw response:",
                text
            );


            // ==========================================
            // CLEAN AI RESPONSE
            // ==========================================

            const cleanedText =
                text
                    .replace(/```json/gi, "")
                    .replace(/```/g, "")
                    .trim();


            // ==========================================
            // PARSE JSON
            // ==========================================

            const data =
                JSON.parse(
                    cleanedText
                );


            // ==========================================
            // NORMALIZE CURRENCY
            // ==========================================

            if (
                !data.currency ||
                typeof data.currency !== "string"
            ) {

                data.currency =
                    "INR";

            }


            data.currency =
                data.currency
                    .trim()
                    .toUpperCase();


            // ==========================================
            // NORMALIZE TOTAL
            // ==========================================

            if (
                data.totalAmount === undefined ||
                data.totalAmount === null ||
                isNaN(
                    Number(
                        data.totalAmount
                    )
                )
            ) {

                data.totalAmount =
                    0;

            }


            data.totalAmount =
                Number(
                    data.totalAmount
                );


            // ==========================================
            // NORMALIZE ITEMS
            // ==========================================

            if (
                !Array.isArray(
                    data.items
                )
            ) {

                data.items = [];

            }


            // ==========================================
            // STORE DATA
            // ==========================================

            currentExtractedData =
                data;


            isManualMode =
                false;


            console.log(
                "Extracted receipt data:",
                data
            );


            // ==========================================
            // SHOW DATA
            // ==========================================

            showExtractedData(
                data
            );


            alert(
                "✅ Receipt scanned successfully!"
            );


        } catch (error) {

            console.error(
                "❌ AI receipt scanning failed:",
                error
            );


            alert(
                "Unable to scan the receipt. Please try again."
            );


        } finally {

            scanButton.disabled =
                false;


            scanButton.textContent =
                originalText;

        }

    }
);


// ==========================================
// FILE TO BASE64
// ==========================================

function fileToBase64(file) {

    return new Promise(

        function (resolve, reject) {

            const reader =
                new FileReader();


            reader.onload =
                function () {

                    const result =
                        reader.result;


                    const base64 =
                        result.split(",")[1];


                    resolve(
                        base64
                    );

                };


            reader.onerror =
                function () {

                    reject(

                        new Error(
                            "Unable to read receipt image."
                        )

                    );

                };


            reader.readAsDataURL(
                file
            );

        }

    );

}


// ==========================================
// CURRENCY SYMBOL
// ==========================================

function getCurrencySymbol(
    currency
) {

    const symbols = {

        INR: "₹",

        USD: "$",

        EUR: "€",

        GBP: "£",

        AED: "د.إ",

        CAD: "C$",

        AUD: "A$"

    };


    return (
        symbols[currency] ||
        currency
    );

}


// ==========================================
// SHOW EXTRACTED DATA
// ==========================================

function showExtractedData(
    data
) {

    console.log(
        "Showing extracted receipt data:",
        data
    );


    const storeNameInput =
        document.getElementById(
            "storeName"
        );


    const purchaseDateInput =
        document.getElementById(
            "purchaseDate"
        );


    const totalAmountInput =
        document.getElementById(
            "totalAmount"
        );


    const categoryInput =
        document.getElementById(
            "category"
        );


    const currencyInput =
        document.getElementById(
            "currency"
        );


    // ==========================================
    // STORE
    // ==========================================

    if (storeNameInput) {

        storeNameInput.value =
            data.storeName || "";

    }


    // ==========================================
    // DATE
    // ==========================================

    if (purchaseDateInput) {

        let date =
            data.purchaseDate || "";


        // DD-MM-YYYY

        if (
            /^\d{2}-\d{2}-\d{4}$/.test(
                date
            )
        ) {

            const parts =
                date.split("-");


            date =
                parts[2] +
                "-" +
                parts[1] +
                "-" +
                parts[0];

        }


        // DD/MM/YYYY

        if (
            /^\d{2}\/\d{2}\/\d{4}$/.test(
                date
            )
        ) {

            const parts =
                date.split("/");


            date =
                parts[2] +
                "-" +
                parts[1] +
                "-" +
                parts[0];

        }


        purchaseDateInput.value =
            date;

    }


    // ==========================================
    // TOTAL
    // ==========================================

    if (totalAmountInput) {

        totalAmountInput.value =
            data.totalAmount || "";

    }


    // ==========================================
    // CURRENCY
    // ==========================================

    if (currencyInput) {

        const validCurrencies = [

            "INR",
            "USD",
            "EUR",
            "GBP",
            "AED",
            "CAD",
            "AUD",
            "Other"

        ];


        if (
            validCurrencies.includes(
                data.currency
            )
        ) {

            currencyInput.value =
                data.currency;

        } else {

            currencyInput.value =
                "Other";

        }

    }


    // ==========================================
    // CATEGORY
    // ==========================================

    if (categoryInput) {

        const allowedCategories = [

            "Food",
            "Grocery",
            "Shopping",
            "Electronics",
            "Clothing",
            "Travel",
            "Medical",
            "Other"

        ];


        if (
            allowedCategories.includes(
                data.category
            )
        ) {

            categoryInput.value =
                data.category;

        } else {

            categoryInput.value =
                "Other";

        }

    }


    // ==========================================
    // ITEMS
    // ==========================================

    if (itemsList) {

        itemsList.innerHTML = "";


        if (
            Array.isArray(data.items) &&
            data.items.length > 0
        ) {

            noItemsMessage.style.display =
                "none";


            const currencySymbol =
                getCurrencySymbol(
                    data.currency
                );


            data.items.forEach(
                function (item) {

                    const itemRow =
                        document.createElement(
                            "div"
                        );


                    itemRow.className =
                        "extracted-item";


                    const itemName =
                        document.createElement(
                            "span"
                        );


                    itemName.className =
                        "item-name";


                    itemName.textContent =
                        item.name ||
                        "Unknown item";


                    const itemDetails =
                        document.createElement(
                            "span"
                        );


                    itemDetails.className =
                        "item-details";


                    itemDetails.textContent =
                        "Qty: " +
                        (item.quantity || 1) +
                        " • " +
                        currencySymbol +
                        (item.price || 0);


                    itemRow.appendChild(
                        itemName
                    );


                    itemRow.appendChild(
                        itemDetails
                    );


                    itemsList.appendChild(
                        itemRow
                    );

                }
            );


        } else {

            noItemsMessage.style.display =
                "block";

        }

    }


    // ==========================================
    // SECTION TITLE
    // ==========================================

    const title =
        document.getElementById(
            "dataSectionTitle"
        );


    const description =
        document.getElementById(
            "dataSectionDescription"
        );


    if (title) {

        title.textContent =
            "Extracted Receipt Information";

    }


    if (description) {

        description.textContent =
            "Review and edit the information extracted by SHOPIX AI before saving.";

    }


    // ==========================================
    // SHOW SECTION
    // ==========================================

    const extractedSection =
        document.getElementById(
            "extractedDataSection"
        );


    if (extractedSection) {

        extractedSection.style.display =
            "block";


        extractedSection.scrollIntoView({

            behavior: "smooth",

            block: "start"

        });

    }


    console.log(
        "✅ Extracted data displayed successfully."
    );

}


// ==========================================
// INITIAL STATE
// ==========================================

resetPreview();