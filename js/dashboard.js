import { auth, db } from "./firebase.js";

import {
    collection,
    query,
    orderBy,
    limit,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";


// ===============================
<<<<<<< HEAD
// ELEMENTS
=======
// LOGOUT STATUS
// ===============================

let logoutStarted = false;


// ===============================
// RECENT RECEIPTS
>>>>>>> 4a0b451920a9aebca3608aac862aa3f73df2f3cd
// ===============================

const receiptList =
    document.getElementById("dashboardReceiptList");


// ===============================
// DASHBOARD EXPENSE ELEMENTS
// ===============================

// Total Expense card
const totalExpenseElement =
    document.querySelector(".stat-card:nth-child(1) h2");


// This Month card
const thisMonthElement =
    document.querySelector(".stat-card:nth-child(4) h2");


// Spending chart
const spendingBars =
    document.getElementById("spendingBars");


// Chart dropdown
const chartPeriod =
    document.getElementById("chartPeriod");


// Chart Y-axis values
const chartValueTop =
    document.getElementById("chartValueTop");

const chartValueSecond =
    document.getElementById("chartValueSecond");

const chartValueThird =
    document.getElementById("chartValueThird");


// ===============================
// CURRENCY FORMAT
// ===============================

function formatCurrency(amount) {

    return "₹" +
        Number(amount || 0)
            .toLocaleString("en-IN");

}


// ===============================
// PARSE AMOUNT
// ===============================

function parseAmount(value) {

    return Number(
        String(value || 0)
            .replace(/[^\d.-]/g, "")
    ) || 0;

}


// ===============================
// PARSE RECEIPT DATE
// ===============================

function parseReceiptDate(value) {

    if (!value) {
        return null;
    }


    // ---------------------------------
    // JavaScript Date
    // ---------------------------------

    if (value instanceof Date) {

        return isNaN(value.getTime())
            ? null
            : value;

    }


    // ---------------------------------
    // Firestore Timestamp
    // ---------------------------------

    if (
        typeof value === "object" &&
        typeof value.toDate === "function"
    ) {

        const date =
            value.toDate();

        return isNaN(date.getTime())
            ? null
            : date;

    }


    const text =
        String(value).trim();


    // =================================
    // FORMAT: YYYY-MM-DD
    // FORMAT: YYYY/MM/DD
    // =================================

    let match =
        text.match(
            /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/
        );


    if (match) {

        const year =
            Number(match[1]);

        const month =
            Number(match[2]) - 1;

        const day =
            Number(match[3]);


        const date =
            new Date(
                year,
                month,
                day
            );


        if (
            date.getFullYear() === year &&
            date.getMonth() === month &&
            date.getDate() === day
        ) {

            return date;

        }

    }


    // =================================
    // FORMAT: DD-MM-YYYY
    // FORMAT: DD/MM/YYYY
    // =================================

    match =
        text.match(
            /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/
        );


    if (match) {

        const day =
            Number(match[1]);

        const month =
            Number(match[2]) - 1;

        const year =
            Number(match[3]);


        const date =
            new Date(
                year,
                month,
                day
            );


        if (
            date.getFullYear() === year &&
            date.getMonth() === month &&
            date.getDate() === day
        ) {

            return date;

        }

    }


    // =================================
    // NORMAL JAVASCRIPT DATE
    // =================================

    const date =
        new Date(text);


    if (!isNaN(date.getTime())) {

        return date;

    }


    console.warn(
        "⚠️ Could not parse receipt date:",
        value
    );


    return null;

}


// ===============================
// LOAD DASHBOARD DATA
// ===============================

async function loadDashboardData(user) {

    try {

        console.log(
            "Loading dashboard data for:",
            user.uid
        );


        const receiptsRef =
            collection(
                db,
                "users",
                user.uid,
                "receipts"
            );


        // Get all receipts
        const snapshot =
            await getDocs(receiptsRef);


        let totalExpense = 0;

        let thisMonthExpense = 0;


        // Current month and year
        const now =
            new Date();

        const currentMonth =
            now.getMonth();

        const currentYear =
            now.getFullYear();


        // ===============================
        // CALCULATE EXPENSES
        // ===============================

        snapshot.forEach(
            (docSnapshot) => {

                const data =
                    docSnapshot.data();


                // Receipt amount
                const amount =
                    parseAmount(
                        data.totalAmount
                    );


                // Add to total
                totalExpense +=
                    amount;


                // ===============================
                // CHECK THIS MONTH
                // ===============================

                const receiptDate =
                    parseReceiptDate(
                        data.purchaseDate
                    );


                if (receiptDate) {

                    if (
                        receiptDate.getMonth() ===
                            currentMonth &&
                        receiptDate.getFullYear() ===
                            currentYear
                    ) {

                        thisMonthExpense +=
                            amount;

                    }

                }

            }
        );


        // ===============================
        // UPDATE TOTAL EXPENSE
        // ===============================

        if (totalExpenseElement) {

            totalExpenseElement.textContent =
                formatCurrency(
                    totalExpense
                );

        }


        // ===============================
        // UPDATE THIS MONTH
        // ===============================

        if (thisMonthElement) {

            thisMonthElement.textContent =
                formatCurrency(
                    thisMonthExpense
                );

        }


        console.log(
            "✅ Dashboard expenses updated:",
            {
                totalExpense,
                thisMonthExpense
            }
        );


    } catch (error) {

        console.error(
            "❌ Error loading dashboard expense data:",
            error
        );


        if (totalExpenseElement) {

            totalExpenseElement.textContent =
                "₹0";

        }


        if (thisMonthElement) {

            thisMonthElement.textContent =
                "₹0";

        }

    }

}


// ===============================
// LOAD SPENDING CHART
// ===============================

async function loadSpendingChart(user) {

    if (!spendingBars) {

        console.warn(
            "⚠️ Spending chart container not found."
        );

        return;

    }


    try {

        console.log(
            "Loading spending chart..."
        );


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


        // ===============================
        // NUMBER OF MONTHS
        // ===============================

        const numberOfMonths =
            chartPeriod
                ? Number(chartPeriod.value)
                : 6;


        // ===============================
        // CURRENT DATE
        // ===============================

        const now =
            new Date();


        const months = [];


        // ===============================
        // CREATE LAST N MONTHS
        // ===============================

        for (
            let i = numberOfMonths - 1;
            i >= 0;
            i--
        ) {

            const date =
                new Date(
                    now.getFullYear(),
                    now.getMonth() - i,
                    1
                );


            months.push({

                year:
                    date.getFullYear(),

                month:
                    date.getMonth(),

                name:
                    date.toLocaleString(
                        "en-US",
                        {
                            month: "short"
                        }
                    ),

                amount: 0

            });

        }


        // ===============================
        // ADD RECEIPTS TO MONTHS
        // ===============================

        snapshot.forEach(
            (docSnapshot) => {

                const data =
                    docSnapshot.data();


                const amount =
                    parseAmount(
                        data.totalAmount
                    );


                const receiptDate =
                    parseReceiptDate(
                        data.purchaseDate
                    );


                if (!receiptDate) {

                    console.warn(
                        "⚠️ Receipt date could not be read:",
                        data.purchaseDate
                    );

                    return;

                }


                // Find matching month
                months.forEach(
                    (item) => {

                        if (
                            receiptDate.getFullYear() ===
                                item.year &&
                            receiptDate.getMonth() ===
                                item.month
                        ) {

                            item.amount +=
                                amount;

                        }

                    }
                );

            }
        );


        // ===============================
        // FIND MAXIMUM VALUE
        // ===============================

        const maxAmount =
            Math.max(
                ...months.map(
                    (item) =>
                        item.amount
                ),
                0
            );


        // ===============================
        // UPDATE Y-AXIS LABELS
        // ===============================

        updateChartLabels(
            maxAmount
        );


        // ===============================
        // CLEAR OLD CHART
        // ===============================

        spendingBars.innerHTML =
            "";


        // ===============================
// NO SPENDING IN SELECTED PERIOD
// ===============================

if (maxAmount === 0) {

    const message =
        document.createElement("div");

    message.innerHTML = `
        <div
            style="
                width:100%;
                text-align:center;
                padding:25px 10px;
            "
        >

            <div
                style="
                    font-size:24px;
                    margin-bottom:8px;
                "
            >
                📊
            </div>

            <div
                style="
                    color:#334155;
                    font-size:13px;
                    font-weight:600;
                    margin-bottom:4px;
                "
            >
                No spending in the selected period
            </div>

            <div
                style="
                    color:#98a2b3;
                    font-size:11px;
                "
            >
                Your saved receipts will appear here
                when they fall within this period.
            </div>

        </div>
    `;


    spendingBars.appendChild(
        message
    );


    return;

}

// ===============================
// UPDATE CHART LABELS
// ===============================

function updateChartLabels(maxAmount) {

    if (!chartValueTop) {
        return;
    }


    // No data
    if (maxAmount <= 0) {

        chartValueTop.textContent =
            "₹0";

        chartValueSecond.textContent =
            "₹0";

        chartValueThird.textContent =
            "₹0";

        return;

    }


    const second =
        maxAmount * 0.66;


    const third =
        maxAmount * 0.33;


    chartValueTop.textContent =
        formatChartValue(
            maxAmount
        );


    chartValueSecond.textContent =
        formatChartValue(
            second
        );


    chartValueThird.textContent =
        formatChartValue(
            third
        );

}


// ===============================
// FORMAT CHART VALUE
// ===============================

function formatChartValue(amount) {

    const value =
        Number(amount || 0);


    // Lakhs
    if (value >= 100000) {

        return "₹" +
            (
                value / 100000
            )
                .toFixed(1)
                .replace(".0", "") +
            "L";

    }


    // Thousands
    if (value >= 1000) {

        return "₹" +
            (
                value / 1000
            )
                .toFixed(1)
                .replace(".0", "") +
            "k";

    }


    return "₹" +
        Math.round(value);

}


// ===============================
// CHART PERIOD CHANGE
// ===============================

if (chartPeriod) {

    chartPeriod.addEventListener(
        "change",
        function () {

            const user =
                auth.currentUser;


            if (user) {

                loadSpendingChart(
                    user
                );

            }

        }
    );

}


// ===============================
// RECENT RECEIPTS
// ===============================

async function loadRecentReceipts(user) {

    if (!receiptList) {
        return;
    }


    receiptList.innerHTML =
        "<p>Loading recent receipts...</p>";


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


        // ===============================
        // NO RECEIPTS
        // ===============================

        if (snapshot.empty) {

            receiptList.innerHTML =
                "<p>No recent receipts found.</p>";

            return;

        }


        receiptList.innerHTML =
            "";


        // ===============================
        // DISPLAY RECEIPTS
        // ===============================

        snapshot.forEach(
            (docSnapshot) => {

                const data =
                    docSnapshot.data();


                const receiptItem =
                    document.createElement(
                        "div"
                    );


                receiptItem.className =
                    "receipt-item";


                receiptItem.innerHTML = `
                    <div>
                        <h4>
                            ${data.storeName || "Unknown Store"}
                        </h4>

                        <p>
                            ${data.purchaseDate || ""}
                        </p>
                    </div>

                    <div>
                        ₹${data.totalAmount || 0}
                    </div>
                `;


                // ===============================
                // OPEN RECEIPT DETAILS
                // ===============================

                receiptItem.addEventListener(
                    "click",
                    function () {

                        localStorage.setItem(
                            "selectedReceiptId",
                            docSnapshot.id
                        );


                        window.location.href =
                            "receiptDetails.html";

                    }
                );


                receiptList.appendChild(
                    receiptItem
                );

            }
        );


    } catch (error) {

        console.error(
            "❌ Error loading receipts:",
            error
        );


        receiptList.innerHTML =
            "<p>Unable to load recent receipts.</p>";

    }

}


// ===============================
// LOGOUT
// ===============================

const logoutButton =
    document.querySelector(
        ".logout-btn"
    );


if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async function (event) {

            event.preventDefault();


            // Mark logout process as started
            logoutStarted = true;


            try {

                // Firebase logout
                await signOut(auth);


<<<<<<< HEAD
=======
                // Save logout status
                sessionStorage.setItem(
                    "loggedOut",
                    "true"
                );


>>>>>>> 4a0b451920a9aebca3608aac862aa3f73df2f3cd
                console.log(
                    "✅ User logged out successfully."
                );


                // ===============================
                // LOGOUT MESSAGE
                // ===============================

                const logoutMessage =
                    document.createElement(
                        "div"
                    );


                logoutMessage.textContent =
                    "✅ You have been logged out successfully.";


<<<<<<< HEAD
                // Position
=======
                // Message position
>>>>>>> 4a0b451920a9aebca3608aac862aa3f73df2f3cd
                logoutMessage.style.position =
                    "fixed";

                logoutMessage.style.bottom =
                    "30px";

                logoutMessage.style.left =
                    "50%";

                logoutMessage.style.transform =
                    "translateX(-50%)";


<<<<<<< HEAD
                // Design
=======
                // Message design
>>>>>>> 4a0b451920a9aebca3608aac862aa3f73df2f3cd
                logoutMessage.style.padding =
                    "14px 22px";

                logoutMessage.style.background =
                    "#ffffff";

                logoutMessage.style.color =
                    "#142d6b";

                logoutMessage.style.borderRadius =
                    "10px";

                logoutMessage.style.boxShadow =
                    "0 4px 15px rgba(0,0,0,0.15)";

                logoutMessage.style.fontSize =
                    "15px";

                logoutMessage.style.fontWeight =
                    "600";

                logoutMessage.style.zIndex =
                    "9999";


                document.body.appendChild(
                    logoutMessage
                );


<<<<<<< HEAD
                // Redirect after 3 seconds
                setTimeout(
                    () => {
=======
                // Show message for 3 seconds
                setTimeout(() => {
>>>>>>> 4a0b451920a9aebca3608aac862aa3f73df2f3cd

                        logoutMessage.remove();

<<<<<<< HEAD
                        window.location.href =
                            "loginpg.html";
=======
                    // Use replace so dashboard
                    // is not kept as a normal
                    // history page after logout

                    window.location.replace(
                        "loginpg.html"
                    );
>>>>>>> 4a0b451920a9aebca3608aac862aa3f73df2f3cd

                    },
                    3000
                );


            } catch (error) {

                console.error(
                    "❌ Logout error:",
                    error
                );

                logoutStarted = false;

            }

        }
    );

}


// ===============================
// AUTHENTICATION & DASHBOARD PROTECTION
// ===============================

onAuthStateChanged(
    auth,
    function (user) {

        if (user) {

<<<<<<< HEAD
            console.log(
                "✅ Dashboard user:",
                user.uid
            );


            // Dynamic expense cards
            loadDashboardData(
                user
            );


            // Recent receipts
            loadRecentReceipts(
                user
            );


            // Dynamic spending chart
            loadSpendingChart(
                user
            );


        } else {

            console.log(
                "ℹ️ No user logged in."
            );


            // Recent receipts
            if (receiptList) {

                receiptList.innerHTML =
                    "<p>Please login to view your receipts.</p>";

            }


            // Total expense
            if (totalExpenseElement) {

                totalExpenseElement.textContent =
                    "₹0";

            }


            // This month
            if (thisMonthElement) {

                thisMonthElement.textContent =
                    "₹0";

            }


            // Chart
            if (spendingBars) {

                spendingBars.innerHTML =
                    "";

            }


            updateChartLabels(
                0
=======
            // User is logged in
            loadRecentReceipts(user);

        } else {

            // User is logged out

            // If logout button was clicked,
            // wait for the logout message
            // and redirect after 3 seconds.

            if (logoutStarted) {

                return;

            }


            // If user is not logged in and
            // directly opens dashboard,
            // send them to login page.

            window.location.replace(
                "loginpg.html"
>>>>>>> 4a0b451920a9aebca3608aac862aa3f73df2f3cd
            );

        }

    }
);