// ==========================================
// SHOPIX - RECEIPT SCANNER
// STEP 1: UPLOAD + PREVIEW + CAMERA
// ==========================================

import { auth, db, storage } from "./firebase.js";

console.log("Firebase connected successfully!");

// Elements

const fileInput =
    document.getElementById("receiptFileInput");

const previewImage =
    document.getElementById("receiptPreview");

const noPreviewText =
    document.getElementById("noPreviewText");

const previewStatus =
    document.getElementById("previewStatus");

const scanButton =
    document.getElementById("scanBtn");

const captureButton =
    document.getElementById("captureBtn");


// ==========================================
// FILE UPLOAD
// ==========================================

fileInput.addEventListener("change", function () {

    const file = fileInput.files[0];

    if (!file) {
        resetPreview();
        return;
    }


    // File size validation

    if (file.size > 10 * 1024 * 1024) {

        alert("Receipt image must be less than 10 MB.");

        fileInput.value = "";

        resetPreview();

        return;
    }


    // File type validation

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
// SHOW PREVIEW
// ==========================================

function showPreview(file) {

    const imageUrl =
        URL.createObjectURL(file);


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
// CAMERA
// ==========================================

captureButton.addEventListener(
    "click",
    async function () {

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

            stream =
                await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: "environment"
                    }
                });


            // Camera overlay

            const overlay =
                document.createElement("div");

            overlay.className =
                "camera-overlay";


            // Video

            const video =
                document.createElement("video");

            video.autoplay = true;

            video.playsInline = true;

            video.srcObject = stream;


            // Capture button

            const capturePhoto =
                document.createElement("button");

            capturePhoto.textContent =
                "📸 Capture Photo";

            capturePhoto.className =
                "camera-capture-btn";


            // Close button

            const closeCamera =
                document.createElement("button");

            closeCamera.textContent =
                "✕ Close";

            closeCamera.className =
                "camera-close-btn";


            overlay.appendChild(video);

            overlay.appendChild(capturePhoto);

            overlay.appendChild(closeCamera);

            document.body.appendChild(overlay);


            // Capture photo

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


                    const canvas =
                        document.createElement("canvas");


                    canvas.width =
                        video.videoWidth;

                    canvas.height =
                        video.videoHeight;


                    const context =
                        canvas.getContext("2d");


                    context.drawImage(
                        video,
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );


                    canvas.toBlob(
                        function (blob) {

                            const capturedFile =
                                new File(
                                    [blob],
                                    "captured-receipt.jpg",
                                    {
                                        type: "image/jpeg"
                                    }
                                );


                            const dataTransfer =
                                new DataTransfer();


                            dataTransfer.items.add(
                                capturedFile
                            );


                            fileInput.files =
                                dataTransfer.files;


                            stream
                                .getTracks()
                                .forEach(
                                    track => track.stop()
                                );


                            overlay.remove();


                            showPreview(
                                capturedFile
                            );

                        },
                        "image/jpeg",
                        0.95
                    );

                }
            );


            // Close camera

            closeCamera.addEventListener(
                "click",
                function () {

                    stream
                        .getTracks()
                        .forEach(
                            track => track.stop()
                        );

                    overlay.remove();

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

        const file =
            fileInput.files[0];


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