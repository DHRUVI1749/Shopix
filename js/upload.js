// ==========================================
// SHOPIX UPLOAD RECEIPT
// ==========================================

const receiptFile =
    document.getElementById("receiptFile");

const filePreview =
    document.getElementById("filePreview");

const fileName =
    document.getElementById("fileName");

const fileSize =
    document.getElementById("fileSize");

const removeFile =
    document.getElementById("removeFile");

const scanBtn =
    document.getElementById("scanBtn");


// ==========================================
// FILE SELECTED
// ==========================================

receiptFile.addEventListener(
    "change",
    function () {

        const file =
            receiptFile.files[0];


        if (!file) {
            return;
        }


        // Maximum 10 MB

        if (
            file.size >
            10 * 1024 * 1024
        ) {

            alert(
                "File size must be less than 10 MB."
            );

            receiptFile.value = "";

            return;
        }


        // Allowed formats

        const allowedTypes = [

            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf"

        ];


        if (
            !allowedTypes.includes(
                file.type
            )
        ) {

            alert(
                "Please select JPG, PNG, WEBP or PDF."
            );

            receiptFile.value = "";

            return;
        }


        fileName.textContent =
            file.name;


        fileSize.textContent =
            (
                file.size /
                (1024 * 1024)
            ).toFixed(2)
            + " MB";


        filePreview.classList.add(
            "active"
        );


        scanBtn.disabled = false;

    }
);


// ==========================================
// REMOVE FILE
// ==========================================

removeFile.addEventListener(
    "click",
    function () {

        receiptFile.value = "";

        fileName.textContent =
            "No file selected";

        fileSize.textContent =
            "Choose a receipt to continue";

        filePreview.classList.remove(
            "active"
        );

        scanBtn.disabled = true;

        sessionStorage.clear();

    }
);


// ==========================================
// SCAN BUTTON
// ==========================================

scanBtn.addEventListener(
    "click",
    function () {

        const file =
            receiptFile.files[0];


        if (!file) {

            alert(
                "Please select a receipt first."
            );

            return;
        }


        scanBtn.disabled = true;

        scanBtn.textContent =
            "Preparing Receipt...";


        const reader =
            new FileReader();


        reader.onload =
            function (event) {


                sessionStorage.setItem(
                    "shopixReceiptFile",
                    event.target.result
                );


                sessionStorage.setItem(
                    "shopixReceiptName",
                    file.name
                );


                sessionStorage.setItem(
                    "shopixReceiptType",
                    file.type
                );


                window.location.href =
                    "ai-scan.html";

            };


        reader.onerror =
            function () {

                scanBtn.disabled = false;

                scanBtn.textContent =
                    "✨ Scan Receipt with AI";

                alert(
                    "Unable to read the receipt."
                );

            };


        reader.readAsDataURL(file);

    }
);