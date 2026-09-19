// ============================================================
// SHOPIX - DASHBOARD
// ============================================================

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


// ============================================================
// ELEMENTS
// ============================================================

const receiptList =
    document.getElementById("dashboardReceiptList");

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


// ============================================================
// CURRENCY FORMAT
// ============================================================

function formatCurrency(amount) {

    return "₹" +
        Number(amount || 0).toLocaleString("en-IN");

}


// ============================================================
// PARSE AMOUNT
// ============================================================

function parseAmount(value) {

    return Number(
        String(value || 0)
            .replace(/[^\d.-]/g, "")
    ) || 0;

}


// ============================================================
// PARSE RECEIPT DATE
// ============================================================

function parseReceiptDate(value) {

    if (!value) {
        return null;
    }


    // Firestore Timestamp
    if (
        typeof value === "object" &&
        typeof value.toDate === "function"
    ) {

        const date = value.toDate();

        return isNaN(date.getTime())
            ? null
            : date;
    }


    // JavaScript Date
    if (value instanceof Date) {

        return isNaN(value.getTime())
            ? null
            : value;
    }


    const text =
        String(value).trim();


    // ========================================================
    // YYYY-MM-DD
    // YYYY/MM/DD
    // ========================================================

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


    // ========================================================
    // DD-MM-YYYY
    // DD/MM/YYYY
    // ========================================================

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


    // ========================================================
    // Normal JavaScript date string
    // ========================================================

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


// ============================================================
// LOAD DASHBOARD EXPENSE DATA
// ============================================================

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


        const snapshot =
            await getDocs(receiptsRef);


        let totalExpense = 0;

        let thisMonthExpense = 0;


        // Current date
        const now =
            new Date();

        const currentMonth =
            now.getMonth();

        const currentYear =
            now.getFullYear();


        // ====================================================
        // CALCULATE EXPENSES
        // ====================================================

        snapshot.forEach((docSnapshot) => {

            const data =
                docSnapshot.data();


            const amount =
                parseAmount(
                    data.totalAmount
                );


            // Total expense
            totalExpense += amount;


            // Receipt date
            const receiptDate =
                parseReceiptDate(
                    data.purchaseDate
                );


            // This month
            if (receiptDate) {

                if (
                    receiptDate.getMonth() === currentMonth &&
                    receiptDate.getFullYear() === currentYear
                ) {

                    thisMonthExpense += amount;

                }

            }

        });


        // ====================================================
        // UPDATE TOTAL EXPENSE
        // ====================================================

        if (totalExpenseElement) {

            totalExpenseElement.textContent =
                formatCurrency(totalExpense);

        }


        // ====================================================
        // UPDATE THIS MONTH
        // ====================================================

        if (thisMonthElement) {

            thisMonthElement.textContent =
                formatCurrency(thisMonthExpense);

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


// ============================================================
// LOAD SPENDING CHART
// ============================================================

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
            await getDocs(receiptsRef);


        // ====================================================
        // GET SELECTED PERIOD
        // ====================================================

        const numberOfMonths =
            chartPeriod
                ? Number(chartPeriod.value) || 6
                : 6;


        // ====================================================
        // CURRENT DATE
        // ====================================================

        const now =
            new Date();


        // ====================================================
        // CREATE LAST N MONTHS
        // ====================================================

        const months = [];


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


        // ====================================================
        // ADD RECEIPTS TO CORRESPONDING MONTH
        // ====================================================

        snapshot.forEach((docSnapshot) => {

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


            months.forEach((item) => {

                if (
                    receiptDate.getFullYear() === item.year &&
                    receiptDate.getMonth() === item.month
                ) {

                    item.amount += amount;

                }

            });

        });


        // ====================================================
        // FIND MAXIMUM MONTHLY VALUE
        // ====================================================

        const maxAmount =
            Math.max(
                ...months.map(
                    item => item.amount
                ),
                0
            );


        // ====================================================
        // UPDATE Y-AXIS
        // ====================================================

        updateChartLabels(maxAmount);


        // ====================================================
        // CLEAR OLD BARS
        // ====================================================

        spendingBars.innerHTML = "";


        // ====================================================
        // NO DATA
        // ====================================================

        if (maxAmount === 0) {

            const message =
                document.createElement("div");


            message.style.width = "100%";
            message.style.textAlign = "center";
            message.style.padding = "25px 10px";


            message.innerHTML = `
                <div style="
                    font-size:24px;
                    margin-bottom:8px;
                ">
                    📊
                </div>

                <div style="
                    color:#334155;
                    font-size:13px;
                    font-weight:600;
                    margin-bottom:4px;
                ">
                    No spending in the selected period
                </div>

                <div style="
                    color:#98a2b3;
                    font-size:11px;
                ">
                    Your saved receipts will appear here
                    when they fall within this period.
                </div>
            `;


            spendingBars.appendChild(message);

            return;
        }


        // ====================================================
        // CREATE BARS
        // ====================================================

        months.forEach((item) => {

            const wrapper =
                document.createElement("div");

            wrapper.className =
                "bar-wrapper";


            // -----------------------------------------------
            // BAR
            // -----------------------------------------------

            const bar =
                document.createElement("div");

            bar.className =
                "bar";


            // Calculate percentage
            const percentage =
                (item.amount / maxAmount) * 100;


            // Bar height
            bar.style.height =
                Math.max(
                    percentage,
                    item.amount > 0 ? 4 : 0
                ) + "%";


            // Current month / highest bar styling
            if (
                item.year === now.getFullYear() &&
                item.month === now.getMonth()
            ) {

                bar.classList.add(
                    "active-bar"
                );

            }


            // Tooltip
            bar.title =
                `${item.name}: ${formatCurrency(item.amount)}`;


            // -----------------------------------------------
            // MONTH LABEL
            // -----------------------------------------------

            const label =
                document.createElement("span");

            label.textContent =
                item.name;


            // -----------------------------------------------
            // APPEND
            // -----------------------------------------------

            wrapper.appendChild(bar);

            wrapper.appendChild(label);

            spendingBars.appendChild(wrapper);

        });


        console.log(
            "✅ Spending chart loaded:",
            months
        );


    } catch (error) {

        console.error(
            "❌ Error loading spending chart:",
            error
        );


        updateChartLabels(0);


        spendingBars.innerHTML = `
            <div style="
                width:100%;
                text-align:center;
                padding:25px 10px;
            ">
                <div style="
                    font-size:24px;
                    margin-bottom:8px;
                ">
                    !
                </div>

                <div style="
                    color:#334155;
                    font-size:13px;
                    font-weight:600;
                    margin-bottom:4px;
                ">
                    Unable to load spending chart
                </div>

                <div style="
                    color:#98a2b3;
                    font-size:11px;
                ">
                    Please try again later.
                </div>
            </div>
        `;

    }

}


// ============================================================
// UPDATE CHART Y-AXIS LABELS
// ============================================================

function updateChartLabels(maxAmount) {

    if (!chartValueTop) {
        return;
    }


    if (maxAmount <= 0) {

        chartValueTop.textContent =
            "₹0";

        if (chartValueSecond) {

            chartValueSecond.textContent =
                "₹0";

        }

        if (chartValueThird) {

            chartValueThird.textContent =
                "₹0";

        }

        return;
    }


    const second =
        maxAmount * 0.66;

    const third =
        maxAmount * 0.33;


    chartValueTop.textContent =
        formatChartValue(maxAmount);


    if (chartValueSecond) {

        chartValueSecond.textContent =
            formatChartValue(second);

    }


    if (chartValueThird) {

        chartValueThird.textContent =
            formatChartValue(third);

    }

}


// ============================================================
// FORMAT CHART VALUES
// ============================================================

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


// ============================================================
// CHART PERIOD CHANGE
// ============================================================

if (chartPeriod) {

    chartPeriod.addEventListener(
        "change",
        function () {

            const user =
                auth.currentUser;


            if (user) {

                loadSpendingChart(user);

            }

        }
    );

}


// ============================================================
// LOAD RECENT RECEIPTS
// ============================================================

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


        // ====================================================
        // NO RECEIPTS
        // ====================================================

        if (snapshot.empty) {

            receiptList.innerHTML =
                "<p>No recent receipts found.</p>";

            return;
        }


        receiptList.innerHTML =
            "";


        // ====================================================
        // DISPLAY RECEIPTS
        // ====================================================

        snapshot.forEach((docSnapshot) => {

            const data =
                docSnapshot.data();


            const receiptItem =
                document.createElement("div");


            receiptItem.className =
                "receipt-row";


            // Store icon
            const icon =
                document.createElement("div");

            icon.className =
                "receipt-store-icon";

            icon.textContent =
                "▣";


            // Info
            const info =
                document.createElement("div");

            info.className =
                "receipt-info";


            const store =
                document.createElement("strong");

            store.textContent =
                data.storeName ||
                "Unknown Store";


            const meta =
                document.createElement("span");

            meta.textContent =
                `${data.category || "Other"} · ${data.purchaseDate || "No date"}`;


            info.appendChild(store);

            info.appendChild(meta);


            // Amount
            const amount =
                document.createElement("div");

            amount.className =
                "receipt-price";


            amount.textContent =
                formatCurrency(
                    parseAmount(
                        data.totalAmount
                    )
                );


            // Append
            receiptItem.appendChild(icon);

            receiptItem.appendChild(info);

            receiptItem.appendChild(amount);


            // =================================================
            // OPEN RECEIPT DETAILS
            // =================================================

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

        });


    } catch (error) {

        console.error(
            "❌ Error loading recent receipts:",
            error
        );


        receiptList.innerHTML =
            "<p>Unable to load recent receipts.</p>";

    }

}


// ============================================================
// LOGOUT
// ============================================================

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


                console.log(
                    "✅ User logged out successfully."
                );


                // =================================================
                // LOGOUT MESSAGE
                // =================================================

                const logoutMessage =
                    document.createElement("div");


                logoutMessage.textContent =
                    "✅ You have been logged out successfully.";


                // Position
                logoutMessage.style.position =
                    "fixed";

                logoutMessage.style.bottom =
                    "30px";

                logoutMessage.style.left =
                    "50%";

                logoutMessage.style.transform =
                    "translateX(-50%)";


                // Design
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


                // Redirect after 3 seconds
                setTimeout(
                    () => {

                        logoutMessage.remove();

                        window.location.href =
                            "loginpg.html";

                    },
                    3000
                );


            } catch (error) {

                console.error(
                    "❌ Logout error:",
                    error
                );

            }

        }
    );

}


// ============================================================
// AUTHENTICATION CHECK
// ============================================================

onAuthStateChanged(
    auth,
    function (user) {

        if (user) {

            console.log(
                "✅ Dashboard user:",
                user.uid
            );


            // Dynamic expense cards
            loadDashboardData(user);


            // Recent receipts
            loadRecentReceipts(user);


            // Dynamic spending chart
            loadSpendingChart(user);

        } else {

            console.log(
                "ℹ️ No user logged in."
            );


            // =================================================
            // RECENT RECEIPTS
            // =================================================

            if (receiptList) {

                receiptList.innerHTML =
                    "<p>Please login to view your receipts.</p>";

            }


            // =================================================
            // TOTAL EXPENSE
            // =================================================

            if (totalExpenseElement) {

                totalExpenseElement.textContent =
                    "₹0";

            }


            // =================================================
            // THIS MONTH
            // =================================================

            if (thisMonthElement) {

                thisMonthElement.textContent =
                    "₹0";

            }


            // =================================================
            // CHART
            // =================================================

            if (spendingBars) {

                spendingBars.innerHTML = `
                    <div style="
                        width:100%;
                        text-align:center;
                        padding:25px 10px;
                    ">
                        <div style="
                            color:#667085;
                            font-size:12px;
                        ">
                            Please login to view spending data.
                        </div>
                    </div>
                `;

            }


            updateChartLabels(0);

        }

    }
);