// ==========================================
// SHOPIX - RECEIPT SCANNER
// UPLOAD + PREVIEW + CAMERA
// ==========================================

import { auth, db, storage } from "./firebase.js";

console.log("Firebase connected successfully!");


// ==========================================
// ELEMENTS
// ==========================================

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
// SCAN BUTTON
// ==========================================

scanButton.addEventListener(
    "click",
    function () {

        const file = fileInput.files[0];

        if (!file) {

            alert(
                "Please upload or capture a receipt first."
            );

            return;
        }

        alert(
            "Receipt is ready for AI scanning. AI/OCR will be connected in the next step."
        );

        console.log(
            "Ready for AI scan:",
            file.name
        );
    }
);


// ==========================================
// INITIAL STATE
// ==========================================

resetPreview();