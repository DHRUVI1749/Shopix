// ==========================================
// SHOPIX - RECEIPT SCANNER
// UPLOAD + PREVIEW + CAMERA
// ==========================================

import { auth, db, storage } from "./firebase.js";
import { model } from "./ai.js";

import {
    collection,
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";

console.log("Firebase connected successfully!");

// ==========================================
// ELEMENTS
// ==========================================

let currentExtractedData = null;

const fileInput = document.getElementById("receiptFileInput");
const previewImage = document.getElementById("receiptPreview");
const noPreviewText = document.getElementById("noPreviewText");
const previewStatus = document.getElementById("previewStatus");
const scanButton = document.getElementById("scanBtn");
const captureButton = document.getElementById("captureBtn");


// ==========================================
// FILE UPLOAD
// ==========================================

fileInput.addEventListener("change", function () {

    const file = fileInput.files[0];

    if (!file) {
        resetPreview();
        return;
    }

    // Maximum file size: 10 MB
    if (file.size > 10 * 1024 * 1024) {

        alert("Receipt image must be less than 10 MB.");

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

        alert("Please select a JPG, PNG or WEBP image.");

        fileInput.value = "";

        resetPreview();

        return;
    }

    showPreview(file);
});


// ==========================================
// SHOW RECEIPT PREVIEW
// ==========================================

function showPreview(file) {

    const imageUrl = URL.createObjectURL(file);

    previewImage.src = imageUrl;
    previewImage.style.display = "block";

    noPreviewText.style.display = "none";

    previewStatus.textContent = "Receipt selected";

    scanButton.disabled = false;

    console.log("Receipt selected:", file.name);
}


// ==========================================
// RESET PREVIEW
// ==========================================

function resetPreview() {

    previewImage.src = "";
    previewImage.style.display = "none";

    noPreviewText.style.display = "flex";

    previewStatus.textContent = "No receipt";

    scanButton.disabled = true;
}

// ==========================================
// SAVE RECEIPT
// ==========================================

const saveReceiptButton = document.getElementById("saveReceiptBtn");

saveReceiptButton.addEventListener("click", async function () {

    if (!currentExtractedData) {
        alert("Please scan the receipt first.");
        return;
    }

    const user = auth.currentUser;

    if (!user) {
        alert("Please login first.");
        return;
    }

    const file = fileInput.files[0];

    if (!file) {
        alert("Receipt image not found.");
        return;
    }

    saveReceiptButton.disabled = true;
    saveReceiptButton.textContent = "Saving...";

    try {

        const receiptId = doc(
            collection(db, "users", user.uid, "receipts")
        ).id;

        // Upload receipt image
        const storageRef = ref(
            storage,
            `receipts/${user.uid}/${receiptId}_${file.name}`
        );

        await uploadBytes(storageRef, file);

        const imageUrl = await getDownloadURL(storageRef);

        // Save receipt data
        await setDoc(
            doc(db, "users", user.uid, "receipts", receiptId),
            {
                storeName: document.getElementById("storeName").value,
                purchaseDate: document.getElementById("purchaseDate").value,
                totalAmount: Number(
                    document.getElementById("totalAmount").value
                ),
                category: document.getElementById("category").value,
                items: currentExtractedData.items || [],
                imageUrl: imageUrl,
                createdAt: serverTimestamp()
            }
        );

        alert("✅ Receipt saved successfully!");

        console.log("Receipt saved:", receiptId);

    } catch (error) {

        console.error("❌ Error saving receipt:", error);

        alert("Unable to save receipt. Please try again.");

    } finally {

        saveReceiptButton.disabled = false;
        saveReceiptButton.textContent = "Save Receipt";

    }
});


// ==========================================
// CAMERA CAPTURE
// ==========================================

captureButton.addEventListener(
    "click",
    async function () {

        // Check camera support
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

            // Open camera
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "environment"
                }
            });


            // ==================================
            // CAMERA OVERLAY
            // ==================================

            const overlay = document.createElement("div");

            overlay.className = "camera-overlay";


            // ==================================
            // VIDEO
            // ==================================

            const video = document.createElement("video");

            video.autoplay = true;
            video.playsInline = true;
            video.srcObject = stream;


            // ==================================
            // CAPTURE BUTTON
            // ==================================

            const capturePhoto =
                document.createElement("button");

            capturePhoto.textContent = "📸 Capture Photo";

            capturePhoto.className =
                "camera-capture-btn";


            // ==================================
            // CLOSE BUTTON
            // ==================================

            const closeCamera =
                document.createElement("button");

            closeCamera.textContent = "✕ Close";

            closeCamera.className =
                "camera-close-btn";


            // Add elements
            overlay.appendChild(video);
            overlay.appendChild(capturePhoto);
            overlay.appendChild(closeCamera);

            document.body.appendChild(overlay);


            // ==================================
            // CAPTURE PHOTO
            // ==================================

            capturePhoto.addEventListener(
                "click",
                function () {

                    // Check camera readiness
                    if (
                        video.videoWidth === 0 ||
                        video.videoHeight === 0
                    ) {

                        alert(
                            "Camera is not ready yet. Please try again."
                        );

                        return;
                    }


                    // Create canvas
                    const canvas =
                        document.createElement("canvas");

                    canvas.width =
                        video.videoWidth;

                    canvas.height =
                        video.videoHeight;


                    // Draw camera frame
                    const context =
                        canvas.getContext("2d");

                    context.drawImage(
                        video,
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );


                    // Convert image to file
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


                            // Put captured image
                            // into file input
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
                                    track =>
                                        track.stop()
                                );


                            // Remove camera overlay
                            overlay.remove();


                            // Show captured receipt
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


            // ==================================
            // CLOSE CAMERA
            // ==================================

            closeCamera.addEventListener(
                "click",
                function () {

                    stream
                        .getTracks()
                        .forEach(
                            track =>
                                track.stop()
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

        const file = fileInput.files[0];

        if (!file) {

            alert(
                "Please upload or capture a receipt first."
            );

            return;
        }

        // Disable button while AI is working
        scanButton.disabled = true;

        const originalText = scanButton.textContent;

        scanButton.textContent =
            "✨ Scanning Receipt...";

        try {

            console.log(
                "Starting AI receipt scan:",
                file.name
            );


            // ==================================
            // CONVERT IMAGE TO BASE64
            // ==================================

            const base64Image =
                await fileToBase64(file);


            console.log(
                "Receipt image converted successfully."
            );


            // ==================================
            // AI PROMPT
            // ==================================

            const prompt = `
You are SHOPIX, an AI receipt scanner.

Analyze the attached receipt image carefully.

Extract the following information:

1. Store Name
2. Purchase Date
3. Total Amount
4. Category
5. Items purchased

For Category, choose ONLY one of:
Electronics
Grocery
Clothing
Travel
Other

Return ONLY valid JSON.

Use this exact format:

{
  "storeName": "",
  "purchaseDate": "",
  "totalAmount": 0,
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
- If a value cannot be identified, use an empty string or 0.
- Read the receipt carefully and do not invent information.
`;


            // ==================================
            // SEND IMAGE + PROMPT TO GEMINI
            // ==================================

            const imagePart = {

                inlineData: {

                    data: base64Image,

                    mimeType: file.type

                }

            };


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


            // ==================================
            // CLEAN AI RESPONSE
            // ==================================

            const cleanedText =
                text
                    .replace(/```json/gi, "")
                    .replace(/```/g, "")
                    .trim();


            // ==================================
            // CONVERT RESPONSE TO JSON
            // ==================================

            const data =
                JSON.parse(cleanedText);

            currentExtractedData = data;

            console.log(
                "Extracted receipt data:",
                data
            );


            // ==================================
            // SHOW EXTRACTED DATA
            // ==================================

            showExtractedData(data);


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

            // Enable button again
            scanButton.disabled = false;

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

                    resolve(base64);

                };


            reader.onerror =
                function () {

                    reject(
                        new Error(
                            "Unable to read receipt image."
                        )
                    );

                };


            reader.readAsDataURL(file);

        }
    );

}


// ==========================================
// SHOW EXTRACTED RECEIPT DATA
// ==========================================

function showExtractedData(data) {


    console.log(
        "Showing extracted receipt data:",
        data
    );


    // ==========================================
    // GET FORM ELEMENTS
    // ==========================================

    const storeNameInput =
        document.getElementById("storeName");


    const purchaseDateInput =
        document.getElementById("purchaseDate");


    const totalAmountInput =
        document.getElementById("totalAmount");


    const categoryInput =
        document.getElementById("category");


    const itemsList =
        document.getElementById("itemsList");


    // ==========================================
    // STORE NAME
    // ==========================================

    if (storeNameInput) {

        storeNameInput.value =
            data.storeName || "";

    }


    // ==========================================
    // PURCHASE DATE
    // ==========================================

    if (purchaseDateInput) {


        let date =
            data.purchaseDate || "";


        // Convert DD-MM-YYYY
        // to YYYY-MM-DD

        if (
            /^\d{2}-\d{2}-\d{4}$/.test(date)
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


        // Convert DD/MM/YYYY
        // to YYYY-MM-DD

        if (
            /^\d{2}\/\d{2}\/\d{4}$/.test(date)
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
    // TOTAL AMOUNT
    // ==========================================

    if (totalAmountInput) {

        totalAmountInput.value =
            data.totalAmount || 0;

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
    // PURCHASED ITEMS
    // ==========================================

    if (itemsList) {


        // Clear old items

        itemsList.innerHTML =
            "";


        if (
            Array.isArray(data.items) &&
            data.items.length > 0
        ) {


            data.items.forEach(
                function (item) {


                    const itemRow =
                        document.createElement("div");


                    itemRow.className =
                        "extracted-item";


                    const itemName =
                        document.createElement("span");


                    itemName.className =
                        "item-name";


                    itemName.textContent =
                        item.name ||
                        "Unknown item";


                    const itemDetails =
                        document.createElement("span");


                    itemDetails.className =
                        "item-details";


                    itemDetails.textContent =
                        "Qty: " +
                        (item.quantity || 1) +
                        " • ₹" +
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


            itemsList.textContent =
                "No items detected.";

        }

    }


    // ==========================================
    // SHOW EXTRACTED DATA SECTION
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


    } else {


        console.error(
            "❌ extractedDataSection not found in HTML."
        );

    }


    console.log(
        "✅ Extracted data displayed successfully."
    );

}


// ==========================================
// INITIAL STATE
// ==========================================

resetPreview();