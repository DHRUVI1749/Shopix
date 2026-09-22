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


// ==========================================
// REALTIME DATABASE
// ==========================================

const realtimeDB = getDatabase(app);


// ==========================================
// GET HTML ELEMENTS
// ==========================================

// Receipt

const receiptList =
    document.getElementById("dashboardReceiptList");


// Dashboard statistics

const totalExpenseElement =
    document.getElementById("totalExpense");

const thisMonthExpenseElement =
    document.getElementById("thisMonthExpense");


// Chart

const chartSelect =
    document.getElementById("chartPeriod");


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


// ==========================================
// CURRENT USER
// ==========================================

let currentUser = null;

let selectedAvatarFile = null;

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


    // Firestore Timestamp

    if (
        typeof value === "object" &&
        typeof value.toDate === "function"
    ) {

        return value.toDate();

    }


    // Firestore Timestamp-like object

    if (
        typeof value === "object" &&
        typeof value.seconds === "number"
    ) {

        return new Date(
            value.seconds * 1000
        );

    }


    // Already Date object

    if (value instanceof Date) {

        return isNaN(value.getTime())
            ? null
            : value;

    }


    const stringValue =
        String(value).trim();


    // ==================================
    // YYYY-MM-DD
    // ==================================

    if (
        /^\d{4}-\d{2}-\d{2}$/
            .test(stringValue)
    ) {

        const [
            year,
            month,
            day
        ] =
            stringValue
                .split("-")
                .map(Number);


        const date =
            new Date(
                year,
                month - 1,
                day
            );


        return isNaN(date.getTime())
            ? null
            : date;

    }


    // ==================================
    // YYYY/MM/DD
    // ==================================

    if (
        /^\d{4}\/\d{2}\/\d{2}$/
            .test(stringValue)
    ) {

        const [
            year,
            month,
            day
        ] =
            stringValue
                .split("/")
                .map(Number);


        const date =
            new Date(
                year,
                month - 1,
                day
            );


        return isNaN(date.getTime())
            ? null
            : date;

    }


    // ==================================
    // DD-MM-YYYY
    // ==================================

    if (
        /^\d{2}-\d{2}-\d{4}$/
            .test(stringValue)
    ) {

        const [
            day,
            month,
            year
        ] =
            stringValue
                .split("-")
                .map(Number);


        const date =
            new Date(
                year,
                month - 1,
                day
            );


        return isNaN(date.getTime())
            ? null
            : date;

    }


    // ==================================
    // DD/MM/YYYY
    // ==================================

    if (
        /^\d{2}\/\d{2}\/\d{4}$/
            .test(stringValue)
    ) {

        const [
            day,
            month,
            year
        ] =
            stringValue
                .split("/")
                .map(Number);


        const date =
            new Date(
                year,
                month - 1,
                day
            );


        return isNaN(date.getTime())
            ? null
            : date;

    }


    // Normal date string

    const date =
        new Date(stringValue);


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
            await getDocs(
                receiptsRef
            );


        let totalExpense = 0;

        let thisMonthExpense = 0;


        const today =
            new Date();


        const currentMonth =
            today.getMonth();


        const currentYear =
            today.getFullYear();


        snapshot.forEach(
            function (doc) {

                const data =
                    doc.data();


                const amount =
                    parseAmount(
                        data.totalAmount ||
                        data.total ||
                        data.amount
                    );


                totalExpense +=
                    amount;


                const receiptDate =
                    parseReceiptDate(
                        data.purchaseDate ||
                        data.date ||
                        data.createdAt
                    );


                if (receiptDate) {

                    const receiptMonth =
                        receiptDate.getMonth();


                    const receiptYear =
                        receiptDate.getFullYear();


                    if (
                        receiptMonth ===
                            currentMonth &&

                        receiptYear ===
                            currentYear
                    ) {

                        thisMonthExpense +=
                            amount;

                    }

                }

            }
        );


        // ==================================
        // TOTAL EXPENSE
        // ==================================

        if (totalExpenseElement) {

            totalExpenseElement.textContent =
                formatCurrency(
                    totalExpense
                );

        }


        // ==================================
        // THIS MONTH
        // ==================================

        if (thisMonthExpenseElement) {

            thisMonthExpenseElement.textContent =
                formatCurrency(
                    thisMonthExpense
                );

        }


        console.log(
            "Total Expense:",
            totalExpense
        );


        console.log(
            "This Month Expense:",
            thisMonthExpense
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
            await getDocs(
                receiptsRef
            );


        const selectedPeriod =
            chartSelect
                ? chartSelect.value
                : "6";


        const today =
            new Date();


        const currentYear =
            today.getFullYear();


        const currentMonth =
            today.getMonth();


        const monthData = [];


        // ==================================
        // THIS YEAR
        // ==================================

        if (selectedPeriod === "12") {

            for (
                let month = 0;
                month < 12;
                month++
            ) {

                const date =
                    new Date(
                        currentYear,
                        month,
                        1
                    );


                monthData.push({

                    year:
                        currentYear,

                    month:
                        month,

                    label:
                        date.toLocaleString(
                            "en-US",
                            {
                                month: "short"
                            }
                        ),

                    value: 0

                });

            }

        }


        // ==================================
        // LAST 6 MONTHS
        // ==================================

        else {

            for (
                let i = 5;
                i >= 0;
                i--
            ) {

                const date =
                    new Date(
                        currentYear,
                        currentMonth - i,
                        1
                    );


                monthData.push({

                    year:
                        date.getFullYear(),

                    month:
                        date.getMonth(),

                    label:
                        date.toLocaleString(
                            "en-US",
                            {
                                month: "short"
                            }
                        ),

                    value: 0

                });

            }

        }


        // ==================================
        // ADD RECEIPTS TO MONTHS
        // ==================================

        snapshot.forEach(
            function (doc) {

                const data =
                    doc.data();


                const receiptDate =
                    parseReceiptDate(
                        data.purchaseDate ||
                        data.date ||
                        data.createdAt
                    );


                if (!receiptDate) {
                    return;
                }


                const amount =
                    parseAmount(
                        data.totalAmount ||
                        data.total ||
                        data.amount
                    );


                const matchingMonth =
                    monthData.find(
                        function (item) {

                            return (

                                item.year ===
                                    receiptDate
                                        .getFullYear()

                                &&

                                item.month ===
                                    receiptDate
                                        .getMonth()

                            );

                        }
                    );


                if (matchingMonth) {

                    matchingMonth.value +=
                        amount;

                }

            }
        );


        console.log(
            "Selected chart:",
            selectedPeriod === "12"
                ? "This year"
                : "Last 6 months"
        );


        console.log(
            "Chart data:",
            monthData
        );


        // ==================================
        // UPDATE CHART
        // ==================================

        updateChart(
            monthData
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
// UPDATE CHART
// ==========================================

function updateChart(monthData) {

    const barsContainer =
        document.querySelector(
            ".bars"
        );


    if (!barsContainer) {

        console.error(
            "Chart bars container not found."
        );

        return;

    }


    // Clear old bars

    barsContainer.innerHTML =
        "";


    // ==================================
    // FIND MAX VALUE
    // ==================================

    let maxValue = 0;


    monthData.forEach(
        function (item) {

            if (
                item.value >
                maxValue
            ) {

                maxValue =
                    item.value;

            }

        }
    );


    // ==================================
    // CREATE CHART BARS
    // ==================================

    monthData.forEach(
        function (item) {

            const wrapper =
                document.createElement(
                    "div"
                );


            wrapper.className =
                "bar-wrapper";


            const bar =
                document.createElement(
                    "div"
                );


            bar.className =
                "bar";


            const label =
                document.createElement(
                    "span"
                );


            label.textContent =
                item.label;


            // ==================================
            // CALCULATE BAR HEIGHT
            // ==================================

            let percentage = 0;


            if (maxValue > 0) {

                percentage =
                    (
                        item.value /
                        maxValue
                    ) * 100;

            }


            // ==================================
            // SMALL VALUE VISIBILITY
            // ==================================

            if (
                item.value > 0 &&
                percentage < 8
            ) {

                percentage = 8;

            }


            bar.style.height =
                percentage + "%";


            // Tooltip

            bar.title =
                item.label +
                " - " +
                formatCurrency(
                    item.value
                );


            wrapper.appendChild(
                bar
            );


            wrapper.appendChild(
                label
            );


            barsContainer.appendChild(
                wrapper
            );

        }
    );


    // ==================================
    // UPDATE Y AXIS
    // ==================================

    updateChartYAxis(
        maxValue
    );

}


// ==========================================
// UPDATE CHART Y AXIS
// ==========================================

function updateChartYAxis(maxValue) {

    const chartValues =
        document.querySelectorAll(
            ".chart-values span"
        );


    if (!chartValues.length) {
        return;
    }


    // ==================================
    // NO DATA
    // ==================================

    if (maxValue <= 0) {

        if (chartValues[0]) {

            chartValues[0].textContent =
                "₹1k";

        }


        if (chartValues[1]) {

            chartValues[1].textContent =
                "₹700";

        }


        if (chartValues[2]) {

            chartValues[2].textContent =
                "₹300";

        }


        if (chartValues[3]) {

            chartValues[3].textContent =
                "₹0";

        }


        return;

    }


    // ==================================
    // SMART SCALE
    // ==================================

    let top;


    // Small values

    if (maxValue < 1000) {

        top =
            Math.ceil(
                maxValue / 100
            ) * 100;


        if (top < 100) {
            top = 100;
        }

    }


    // Medium / large values

    else {

        top =
            Math.ceil(
                maxValue / 5000
            ) * 5000;

    }


    const second =
        top * (2 / 3);


    const third =
        top * (1 / 3);


    // ==================================
    // UPDATE LABELS
    // ==================================

    if (chartValues[0]) {

        chartValues[0].textContent =
            formatChartValue(
                top
            );

    }


    if (chartValues[1]) {

        chartValues[1].textContent =
            formatChartValue(
                second
            );

    }


    if (chartValues[2]) {

        chartValues[2].textContent =
            formatChartValue(
                third
            );

    }


    if (chartValues[3]) {

        chartValues[3].textContent =
            "₹0";

    }

}


// ==========================================
// FORMAT CHART VALUE
// ==========================================

function formatChartValue(value) {

    if (value >= 100000) {

        return (
            "₹" +
            (value / 100000)
                .toFixed(1) +
            "L"
        );

    }


    if (value >= 1000) {

        return (
            "₹" +
            (value / 1000)
                .toFixed(1) +
            "k"
        );

    }


    return (
        "₹" +
        Math.round(value)
    );

}


// ==========================================
// CHART DROPDOWN
// ==========================================

if (chartSelect) {

    chartSelect.addEventListener(
        "change",
        function () {

            console.log(
                "Chart period changed:",
                this.value
            );


            if (currentUser) {

                loadSpendingChart(
                    currentUser
                );

            }

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


        receiptList.innerHTML =
            "";


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
// PROFILE - OPEN
// ==========================================

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


            selectedAvatarFile =
                null;


            if (avatarInput) {
                avatarInput.value =
                    "";
            }


            profileModal.style.display =
                "flex";

        }
    );

}


// ==========================================
// CHANGE AVATAR
// ==========================================

if (
    changeAvatarBtn &&
    avatarInput
) {

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


            if (
                !file.type.startsWith(
                    "image/"
                )
            ) {

                profileMessage.textContent =
                    "Please select an image.";


                profileMessage.style.color =
                    "red";


                avatarInput.value =
                    "";


                return;

            }


            selectedAvatarFile =
                file;


            avatarRemoved =
                false;


            const imageURL =
                URL.createObjectURL(
                    file
                );


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


            selectedAvatarFile =
                null;


            if (avatarInput) {
                avatarInput.value =
                    "";
            }


            avatarRemoved =
                true;


            const name =
                currentUser.displayName ||
                "User";


            const initial =
                name
                    .charAt(0)
                    .toUpperCase();


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
// CLOSE PROFILE OUTSIDE
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
                    currentUser.photoURL ||
                    null;


                // ==================================
                // REMOVE OLD AVATAR
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

                        console.log(
                            "No old avatar found in Storage."
                        );

                    }


                    photoURL =
                        null;

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


                    await uploadBytes(
                        avatarRef,
                        selectedAvatarFile
                    );


                    photoURL =
                        await getDownloadURL(
                            avatarRef
                        );


                    console.log(
                        "Avatar uploaded successfully."
                    );

                }


                // ==================================
                // UPDATE AUTH PROFILE
                // ==================================

                await updateProfile(
                    currentUser,
                    {
                        displayName:
                            newName,

                        photoURL:
                            photoURL
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
                        name:
                            newName,

                        email:
                            currentUser.email ||
                            ""
                    }
                );


                // ==================================
                // UPDATE UI
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


                selectedAvatarFile =
                    null;


                avatarRemoved =
                    false;


                if (avatarInput) {
                    avatarInput.value =
                        "";
                }


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

                await signOut(
                    auth
                );


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
            // USER LOGGED IN
            // ==================================

            currentUser =
                user;


            avatarRemoved =
                false;


            console.log(
                "✅ Dashboard user:",
                user.uid
            );


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
            // PROFILE AVATAR
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
                    user.email ||
                    "";

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


            window.location.replace(
                "loginpg.html"
            );

        }

    }
);