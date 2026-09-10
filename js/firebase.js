const receiptFile = document.getElementById("receiptFile");
const filePreview = document.getElementById("filePreview");
const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");
const removeFile = document.getElementById("removeFile");
const scanBtn = document.getElementById("scanBtn");


receiptFile.addEventListener("change", function () {

    const file = this.files[0];

    if (!file) {
        return;
    }


    // Check file size
    if (file.size > 10 * 1024 * 1024) {

        alert("File size must be less than 10 MB.");

        receiptFile.value = "";

        return;
    }


    // Check file type
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf"
    ];

    if (!allowedTypes.includes(file.type)) {

        alert(
            "Please select JPG, JPEG, PNG, WEBP or PDF file."
        );

        receiptFile.value = "";

        return;
    }


    // Show file information
    fileName.textContent = file.name;

    fileSize.textContent =
        (file.size / (1024 * 1024)).toFixed(2) + " MB";

    filePreview.classList.add("active");

    scanBtn.disabled = false;

});


removeFile.addEventListener("click", function () {

    receiptFile.value = "";

    fileName.textContent = "No file selected";

    fileSize.textContent =
        "Choose a receipt to continue";

    filePreview.classList.remove("active");

    scanBtn.disabled = true;

});


scanBtn.addEventListener("click", function () {

    const file = receiptFile.files[0];

    if (!file) {

        alert("Please select a receipt first.");

        return;
    }


    const reader = new FileReader();


    reader.onload = function (event) {

        // Save actual receipt
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


        // Open AI scan page
        window.location.href = "ai-scan.html";

    };


    reader.onerror = function () {

        alert("Unable to read the receipt file.");

    };


    reader.readAsDataURL(file);

});