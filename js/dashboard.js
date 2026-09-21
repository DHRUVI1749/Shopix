// ==========================================
// FIREBASE IMPORT
// ==========================================

import {
    app,
    auth,
    db,
    storage
} from "./firebase.js";


import {
    collection,
    query,
    orderBy,
    limit,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


import {
    onAuthStateChanged,
    signOut,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";


import {
    getDatabase,
    ref,
    update
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";


import {
    ref as storageRef,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";


// Realtime Database for user profile

const realtimeDB = getDatabase(app);



// ==========================================
// GET HTML ELEMENTS
// ==========================================

// Receipt

const receiptList =
    document.getElementById("dashboardReceiptList");


// Profile

const profileButton =
    document.getElementById("profileButton");

const profileModal =
    document.getElementById("profileModal");

const closeProfile =
    document.getElementById("closeProfile");

const profileName =
    document.getElementById("profileName");

const profileAvatar =
    document.getElementById("profileAvatar");

const profileLargeAvatar =
    document.getElementById("profileLargeAvatar");

const profileNameInput =
    document.getElementById("profileNameInput");

const profileEmailInput =
    document.getElementById("profileEmailInput");

const saveProfile =
    document.getElementById("saveProfile");

const profileMessage =
    document.getElementById("profileMessage");


// ==========================================
// AVATAR ELEMENTS
// ==========================================

const changeAvatarBtn =
    document.getElementById("changeAvatarBtn");

const removeAvatarBtn =
    document.getElementById("removeAvatarBtn");

const avatarInput =
    document.getElementById("avatarInput");


// Current logged-in user

let currentUser = null;


// Selected avatar file

let selectedAvatarFile = null;


// Avatar removed flag

let avatarRemoved = false;



// ==========================================
// FORMAT CURRENCY
// ==========================================

function formatCurrency(amount) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }
    ).format(amount);

}



// ==========================================
// PARSE AMOUNT
// ==========================================

function parseAmount(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return 0;
    }


    if (typeof value === "number") {
        return value;
    }


    const cleaned =
        String(value)
            .replace(/[₹,\s]/g, "")
            .replace(/[^\d.-]/g, "");


    const amount =
        parseFloat(cleaned);


    return isNaN(amount)
        ? 0
        : amount;

}



// ==========================================
// PARSE RECEIPT DATE
// ==========================================

function parseReceiptDate(value) {

    if (!value) {
        return null;
    }


    if (
        typeof value === "object" &&
        value.seconds
    ) {

        return new Date(
            value.seconds * 1000
        );

    }


    const date =
        new Date(value);


    if (isNaN(date.getTime())) {
        return null;
    }


    return date;

}



// ==========================================
// LOAD DASHBOARD DATA
// ==========================================

async function loadDashboardData(user) {

    try {

        const receiptsRef =
            collection(
                db,
                "users",
                user.uid,
                "receipts"
            );


        const snapshot =
            await getDocs(receiptsRef);


        let totalExpense = 0;


        snapshot.forEach(
            function (doc) {

                const data =
                    doc.data();


                totalExpense +=
                    parseAmount(
                        data.totalAmount ||
                        data.total ||
                        data.amount
                    );

            }
        );


        console.log(
            "Total Expense:",
            totalExpense
        );


    }

    catch (error) {

        console.error(
            "Dashboard data error:",
            error
        );

    }

}



// ==========================================
// LOAD SPENDING CHART
// ==========================================

async function loadSpendingChart(user) {

    try {

        const receiptsRef =
            collection(
                db,
                "users",
                user.uid,
                "receipts"
            );


        const snapshot =
            await getDocs(receiptsRef);


        const monthlyData = {};


        snapshot.forEach(
            function (doc) {

                const data =
                    doc.data();


                const date =
                    parseReceiptDate(
                        data.purchaseDate ||
                        data.date ||
                        data.createdAt
                    );


                if (!date) {
                    return;
                }


                const month =
                    date.toLocaleString(
                        "en-US",
                        {
                            month: "short"
                        }
                    );


                const amount =
                    parseAmount(
                        data.totalAmount ||
                        data.total ||
                        data.amount
                    );


                if (!monthlyData[month]) {
                    monthlyData[month] = 0;
                }


                monthlyData[month] += amount;

            }
        );


        console.log(
            "Monthly spending:",
            monthlyData
        );


        updateChartLabels(
            monthlyData
        );

    }

    catch (error) {

        console.error(
            "Spending chart error:",
            error
        );

    }

}



// ==========================================
// UPDATE CHART LABELS
// ==========================================

function updateChartLabels(data) {

    const chartBars =
        document.querySelectorAll(
            ".bar-wrapper"
        );


    if (!chartBars.length) {
        return;
    }


    const months = [
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug"
    ];


    let maxValue = 0;


    Object.values(data).forEach(
        function (value) {

            if (value > maxValue) {
                maxValue = value;
            }

        }
    );


    if (maxValue === 0) {
        return;
    }


    chartBars.forEach(
        function (wrapper, index) {

            const month =
                months[index];


            const value =
                data[month] || 0;


            const bar =
                wrapper.querySelector(
                    ".bar"
                );


            if (!bar) {
                return;
            }


            let percentage =
                (value / maxValue) * 100;


            if (percentage < 5 && value > 0) {
                percentage = 5;
            }


            bar.style.height =
                percentage + "%";

        }
    );

}



// ==========================================
// FORMAT CHART VALUE
// ==========================================

function formatChartValue(value) {

    if (value >= 1000) {

        return (
            "₹" +
            (value / 1000).toFixed(1) +
            "k"
        );

    }


    return "₹" + value;

}



// ==========================================
// CHART PERIOD
// ==========================================

const chartSelect =
    document.querySelector(
        ".spending-card select"
    );


if (chartSelect) {

    chartSelect.addEventListener(
        "change",
        function () {

            console.log(
                "Chart period:",
                this.value
            );

        }
    );

}



// ==========================================
// LOAD RECENT RECEIPTS
// ==========================================

async function loadRecentReceipts(user) {

    if (!receiptList) {
        return;
    }


    try {

        const receiptsRef =
            collection(
                db,
                "users",
                user.uid,
                "receipts"
            );


        const receiptsQuery =
            query(
                receiptsRef,
                orderBy(
                    "createdAt",
                    "desc"
                ),
                limit(3)
            );


        const snapshot =
            await getDocs(
                receiptsQuery
            );


        receiptList.innerHTML = "";


        if (snapshot.empty) {

            receiptList.innerHTML =
                `
                <div class="receipt-row">

                    <div class="receipt-store-icon">
                        ▣
                    </div>

                    <div class="receipt-info">

                        <strong>
                            No receipts yet
                        </strong>

                        <span>
                            Upload your first receipt
                        </span>

                    </div>

                    <div class="receipt-price">
                        —
                    </div>

                </div>
                `;

            return;

        }


        snapshot.forEach(
            function (doc) {

                const data =
                    doc.data();


                const storeName =
                    data.storeName ||
                    "Unknown Store";


                const amount =
                    parseAmount(
                        data.totalAmount ||
                        data.total ||
                        data.amount
                    );


                const date =
                    parseReceiptDate(
                        data.purchaseDate ||
                        data.date ||
                        data.createdAt
                    );


                let dateText =
                    "Date unavailable";


                if (date) {

                    dateText =
                        date.toLocaleDateString(
                            "en-IN"
                        );

                }


                const row =
                    document.createElement(
                        "div"
                    );


                row.className =
                    "receipt-row";


                row.innerHTML =
                    `
                    <div class="receipt-store-icon">
                        ▣
                    </div>

                    <div class="receipt-info">

                        <strong>
                            ${storeName}
                        </strong>

                        <span>
                            ${dateText}
                        </span>

                    </div>

                    <div class="receipt-price">
                        ${formatCurrency(amount)}
                    </div>
                    `;


                receiptList.appendChild(
                    row
                );

            }
        );

    }

    catch (error) {

        console.error(
            "Recent receipts error:",
            error
        );


        receiptList.innerHTML =
            `
            <div class="receipt-row">

                <div class="receipt-store-icon">
                    !
                </div>

                <div class="receipt-info">

                    <strong>
                        Unable to load receipts
                    </strong>

                    <span>
                        Please try again later
                    </span>

                </div>

                <div class="receipt-price">
                    —
                </div>

            </div>
            `;

    }

}



// ==========================================
// PROFILE
// ==========================================

// Open profile

if (profileButton) {

    profileButton.addEventListener(
        "click",
        function () {

            if (!currentUser) {
                return;
            }


            const name =
                currentUser.displayName ||
                "User";


            const email =
                currentUser.email ||
                "";


            profileNameInput.value =
                name;


            profileEmailInput.value =
                email;


            // ==================================
            // LOAD SAVED AVATAR
            // ==================================

            if (
                currentUser.photoURL &&
                !avatarRemoved
            ) {

                profileAvatar.innerHTML =
                    `
                    <img
                        src="${currentUser.photoURL}"
                        alt="Profile Avatar"
                        style="
                            width:100%;
                            height:100%;
                            object-fit:cover;
                            border-radius:50%;
                        ">
                    `;


                profileLargeAvatar.innerHTML =
                    `
                    <img
                        src="${currentUser.photoURL}"
                        alt="Profile Avatar"
                        style="
                            width:100%;
                            height:100%;
                            object-fit:cover;
                            border-radius:50%;
                        ">
                    `;

            }

            else {

                profileAvatar.textContent =
                    name
                        .charAt(0)
                        .toUpperCase();


                profileLargeAvatar.textContent =
                    name
                        .charAt(0)
                        .toUpperCase();

            }


            profileMessage.textContent =
                "";


            profileMessage.style.color =
                "";


            // Reset selected file

            selectedAvatarFile = null;


            if (avatarInput) {
                avatarInput.value = "";
            }


            profileModal.style.display =
                "flex";

        }
    );

}



// ==========================================
// CHANGE AVATAR
// ==========================================

if (changeAvatarBtn && avatarInput) {

    changeAvatarBtn.addEventListener(
        "click",
        function () {

            avatarInput.click();

        }
    );


    avatarInput.addEventListener(
        "change",
        function () {

            const file =
                avatarInput.files[0];


            if (!file) {
                return;
            }


            // Check image

            if (!file.type.startsWith("image/")) {

                profileMessage.textContent =
                    "Please select an image.";

                profileMessage.style.color =
                    "red";

                avatarInput.value = "";

                return;

            }


            // Save selected file

            selectedAvatarFile =
                file;


            // New avatar selected

            avatarRemoved = false;


            // Create preview

            const imageURL =
                URL.createObjectURL(file);


            profileAvatar.innerHTML =
                `
                <img
                    src="${imageURL}"
                    alt="Profile Avatar"
                    style="
                        width:100%;
                        height:100%;
                        object-fit:cover;
                        border-radius:50%;
                    ">
                `;


            profileLargeAvatar.innerHTML =
                `
                <img
                    src="${imageURL}"
                    alt="Profile Avatar"
                    style="
                        width:100%;
                        height:100%;
                        object-fit:cover;
                        border-radius:50%;
                    ">
                `;


            profileMessage.textContent =
                "Avatar selected. Click Save Changes to save it.";

            profileMessage.style.color =
                "green";

        }
    );

}



// ==========================================
// REMOVE AVATAR
// ==========================================

if (removeAvatarBtn) {

    removeAvatarBtn.addEventListener(
        "click",
        function () {

            if (!currentUser) {
                return;
            }


            // Remove selected new image

            selectedAvatarFile = null;


            if (avatarInput) {
                avatarInput.value = "";
            }


            // Mark avatar as removed

            avatarRemoved = true;


            const name =
                currentUser.displayName ||
                "User";


            const initial =
                name
                    .charAt(0)
                    .toUpperCase();


            // Show initial instead of photo

            profileAvatar.textContent =
                initial;


            profileLargeAvatar.textContent =
                initial;


            profileMessage.textContent =
                "Profile picture removed. Click Save Changes to confirm.";

            profileMessage.style.color =
                "green";

        }
    );

}



// ==========================================
// CLOSE PROFILE
// ==========================================

if (closeProfile) {

    closeProfile.addEventListener(
        "click",
        function () {

            profileModal.style.display =
                "none";

        }
    );

}



// ==========================================
// CLOSE PROFILE BY CLICKING OUTSIDE
// ==========================================

if (profileModal) {

    profileModal.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                profileModal
            ) {

                profileModal.style.display =
                    "none";

            }

        }
    );

}



// ==========================================
// SAVE PROFILE
// ==========================================

if (saveProfile) {

    saveProfile.addEventListener(
        "click",
        async function () {

            if (!currentUser) {
                return;
            }


            const newName =
                profileNameInput.value.trim();


            // Validation

            if (!newName) {

                profileMessage.textContent =
                    "Please enter your name.";

                profileMessage.style.color =
                    "red";

                return;

            }


            saveProfile.disabled =
                true;


            saveProfile.textContent =
                "Saving...";


            profileMessage.textContent =
                "";


            try {

                // ==================================
                // CURRENT PHOTO URL
                // ==================================

                let photoURL =
                    currentUser.photoURL || null;


                // ==================================
                // REMOVE AVATAR FROM STORAGE
                // ==================================

                if (avatarRemoved) {

                    try {

                        const oldAvatarRef =
                            storageRef(
                                storage,
                                "avatars/" +
                                currentUser.uid +
                                "/profile.jpg"
                            );


                        await deleteObject(
                            oldAvatarRef
                        );


                        console.log(
                            "Old avatar deleted from Storage."
                        );

                    }

                    catch (error) {

                        // If old image does not exist,
                        // continue normally.

                        console.log(
                            "No old avatar found in Storage."
                        );

                    }


                    photoURL = null;

                }


                // ==================================
                // UPLOAD NEW AVATAR
                // ==================================

                if (selectedAvatarFile) {

                    const avatarRef =
                        storageRef(
                            storage,
                            "avatars/" +
                            currentUser.uid +
                            "/profile.jpg"
                        );


                    // Upload image to Firebase Storage

                    await uploadBytes(
                        avatarRef,
                        selectedAvatarFile
                    );


                    // Get permanent download URL

                    photoURL =
                        await getDownloadURL(
                            avatarRef
                        );


                    console.log(
                        "Avatar uploaded successfully."
                    );

                }


                // ==================================
                // UPDATE FIREBASE AUTH PROFILE
                // ==================================

                await updateProfile(
                    currentUser,
                    {
                        displayName: newName,
                        photoURL: photoURL
                    }
                );


                // ==================================
                // UPDATE REALTIME DATABASE
                // ==================================

                await update(
                    ref(
                        realtimeDB,
                        "users/" +
                        currentUser.uid
                    ),
                    {
                        name: newName,
                        email:
                            currentUser.email ||
                            ""
                    }
                );


                // ==================================
                // UPDATE DASHBOARD UI
                // ==================================

                profileName.textContent =
                    newName;


                if (photoURL) {

                    profileAvatar.innerHTML =
                        `
                        <img
                            src="${photoURL}"
                            alt="Profile Avatar"
                            style="
                                width:100%;
                                height:100%;
                                object-fit:cover;
                                border-radius:50%;
                            ">
                        `;


                    profileLargeAvatar.innerHTML =
                        `
                        <img
                            src="${photoURL}"
                            alt="Profile Avatar"
                            style="
                                width:100%;
                                height:100%;
                                object-fit:cover;
                                border-radius:50%;
                            ">
                        `;

                }

                else {

                    profileAvatar.textContent =
                        newName
                            .charAt(0)
                            .toUpperCase();


                    profileLargeAvatar.textContent =
                        newName
                            .charAt(0)
                            .toUpperCase();

                }


                profileMessage.textContent =
                    "Profile updated successfully.";

                profileMessage.style.color =
                    "green";


                console.log(
                    "Profile updated successfully."
                );


                // Reset variables

                selectedAvatarFile = null;

                avatarRemoved = false;


                if (avatarInput) {
                    avatarInput.value = "";
                }


                // Close modal after 1 second

                setTimeout(
                    function () {

                        profileModal.style.display =
                            "none";

                    },
                    1000
                );

            }

            catch (error) {

                console.error(
                    "Profile update error:",
                    error
                );


                profileMessage.textContent =
                    "Unable to update profile. Please try again.";

                profileMessage.style.color =
                    "red";

            }


            saveProfile.disabled =
                false;


            saveProfile.textContent =
                "Save Changes";

        }
    );

}



// ==========================================
// LOGOUT
// ==========================================

const logoutButton =
    document.querySelector(
        ".logout-btn"
    );


if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async function (event) {

            event.preventDefault();


            try {

                await signOut(auth);


                sessionStorage.setItem(
                    "loggedOut",
                    "true"
                );


                console.log(
                    "User logged out."
                );


                window.location.replace(
                    "loginpg.html"
                );

            }

            catch (error) {

                console.error(
                    "Logout error:",
                    error
                );

            }

        }
    );

}



// ==========================================
// AUTH STATE
// ==========================================

onAuthStateChanged(
    auth,
    function (user) {

        if (user) {

            // ==================================
            // USER IS LOGGED IN
            // ==================================

            currentUser =
                user;


            avatarRemoved = false;


            console.log(
                "✅ Dashboard user:",
                user.uid
            );


            // Remove old logout flag

            sessionStorage.removeItem(
                "loggedOut"
            );


            // ==================================
            // PROFILE INFORMATION
            // ==================================

            const displayName =
                user.displayName ||
                "User";


            if (profileName) {

                profileName.textContent =
                    displayName;

            }


            // ==================================
            // LOAD PROFILE AVATAR
            // ==================================

            if (profileAvatar) {

                if (user.photoURL) {

                    profileAvatar.innerHTML =
                        `
                        <img
                            src="${user.photoURL}"
                            alt="Profile Avatar"
                            style="
                                width:100%;
                                height:100%;
                                object-fit:cover;
                                border-radius:50%;
                            ">
                        `;

                }

                else {

                    profileAvatar.textContent =
                        displayName
                            .charAt(0)
                            .toUpperCase();

                }

            }


            if (profileLargeAvatar) {

                if (user.photoURL) {

                    profileLargeAvatar.innerHTML =
                        `
                        <img
                            src="${user.photoURL}"
                            alt="Profile Avatar"
                            style="
                                width:100%;
                                height:100%;
                                object-fit:cover;
                                border-radius:50%;
                            ">
                        `;

                }

                else {

                    profileLargeAvatar.textContent =
                        displayName
                            .charAt(0)
                            .toUpperCase();

                }

            }


            if (profileNameInput) {

                profileNameInput.value =
                    displayName;

            }


            if (profileEmailInput) {

                profileEmailInput.value =
                    user.email || "";

            }


            // ==================================
            // LOAD DASHBOARD
            // ==================================

            loadDashboardData(
                user
            );


            loadRecentReceipts(
                user
            );


            loadSpendingChart(
                user
            );

        }

        else {

            // ==================================
            // USER NOT LOGGED IN
            // ==================================

            console.log(
                "ℹ️ No user logged in."
            );


            currentUser =
                null;


            if (receiptList) {

                receiptList.innerHTML =
                    `
                    <p>
                        Please login to view your receipts.
                    </p>
                    `;

            }


            // Redirect to login

            window.location.replace(
                "loginpg.html"
            );

        }

    }
);