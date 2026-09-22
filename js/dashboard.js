// ==========================================
// SHOPIX - DASHBOARD
// ==========================================

// ==========================================
// FIREBASE IMPORT
// ==========================================

import {
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
    ref as storageRef,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";


// ==========================================
// GET HTML ELEMENTS
// ==========================================

// Recent Receipts
const receiptList =
    document.getElementById("dashboardReceiptList");

// Total Expense
const totalExpenseElement =
    document.getElementById("totalExpense");

const totalExpenseNote =
    document.getElementById("totalExpenseNote");

// Currency Summary
const currencySummaryText =
    document.getElementById("currencySummaryText");

const currencySummaryList =
    document.getElementById("currencySummaryList");

// Chart
const chartSelect =
    document.getElementById("chartPeriod");

const chartCurrency =
    document.getElementById("chartCurrency");

const spendingBars =
    document.getElementById("spendingBars");

const chartY1 =
    document.getElementById("chartY1");

const chartY2 =
    document.getElementById("chartY2");

const chartY3 =
    document.getElementById("chartY3");

const chartY4 =
    document.getElementById("chartY4");

const chartDescription =
    document.getElementById("chartDescription");


// ==========================================
// PROFILE
// ==========================================

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
// CURRENCY SYMBOL
// ==========================================

function getCurrencySymbol(currency) {

    const symbols = {

        INR: "₹",
        USD: "$",
        EUR: "€",
        GBP: "£",
        AED: "د.إ",
        CAD: "C$",
        AUD: "A$",
        Other: ""

    };

    return symbols[currency] || currency || "";
}


// ==========================================
// FORMAT CURRENCY
// ==========================================

function formatCurrency(
    amount,
    currency = "INR"
) {

    const number =
        Number(amount) || 0;

    const normalizedCurrency =
        normalizeCurrency(currency);

    const symbol =
        getCurrencySymbol(
            normalizedCurrency
        );

    const formattedNumber =
        new Intl.NumberFormat(
            "en-IN",
            {
                maximumFractionDigits: 2
            }
        ).format(number);

    if (normalizedCurrency === "Other") {

        return formattedNumber;

    }

    return (
        symbol +
        formattedNumber
    );
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

    if (
        typeof value === "number"
    ) {
        return value;
    }

    const cleaned =
        String(value)
            .replace(
                /[₹$€£,\s]/g,
                ""
            )
            .replace(
                /[^\d.-]/g,
                ""
            );

    const amount =
        parseFloat(cleaned);

    return isNaN(amount)
        ? 0
        : amount;
}


// ==========================================
// NORMALIZE CURRENCY
// ==========================================

function normalizeCurrency(currency) {

    if (!currency) {
        return "INR";
    }

    const value =
        String(currency)
            .trim()
            .toUpperCase();

    const validCurrencies = [
        "INR",
        "USD",
        "EUR",
        "GBP",
        "AED",
        "CAD",
        "AUD"
    ];

    if (
        validCurrencies.includes(
            value
        )
    ) {
        return value;
    }

    return "Other";
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


    // Timestamp-like object
    if (
        typeof value === "object" &&
        typeof value.seconds === "number"
    ) {

        return new Date(
            value.seconds * 1000
        );

    }


    // Date object
    if (
        value instanceof Date
    ) {

        return isNaN(
            value.getTime()
        )
            ? null
            : value;

    }


    const stringValue =
        String(value).trim();


    // YYYY-MM-DD
    if (
        /^\d{4}-\d{2}-\d{2}$/.test(
            stringValue
        )
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

        return isNaN(
            date.getTime()
        )
            ? null
            : date;
    }


    // YYYY/MM/DD
    if (
        /^\d{4}\/\d{2}\/\d{2}$/.test(
            stringValue
        )
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

        return isNaN(
            date.getTime()
        )
            ? null
            : date;
    }


    // DD-MM-YYYY
    if (
        /^\d{2}-\d{2}-\d{4}$/.test(
            stringValue
        )
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

        return isNaN(
            date.getTime()
        )
            ? null
            : date;
    }


    // DD/MM/YYYY
    if (
        /^\d{2}\/\d{2}\/\d{4}$/.test(
            stringValue
        )
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

        return isNaN(
            date.getTime()
        )
            ? null
            : date;
    }


    // Normal date
    const date =
        new Date(stringValue);

    return isNaN(
        date.getTime()
    )
        ? null
        : date;
}


// ==========================================
// GET RECEIPT DATA
// ==========================================

function getReceiptAmount(data) {

    return parseAmount(
        data.totalAmount ??
        data.total ??
        data.amount
    );
}


function getReceiptCurrency(data) {

    return normalizeCurrency(
        data.currency
    );
}


function getReceiptDate(data) {

    return parseReceiptDate(
        data.purchaseDate ??
        data.date ??
        data.createdAt
    );
}


// ==========================================
// LOAD ALL RECEIPTS
// ==========================================

async function getAllReceipts(user) {

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

    const receipts = [];

    snapshot.forEach(
        function (docSnapshot) {

            receipts.push({
                id: docSnapshot.id,
                data: docSnapshot.data()
            });

        }
    );

    return receipts;
}


// ==========================================
// LOAD DASHBOARD TOTAL + CURRENCY SUMMARY
// ==========================================

async function loadDashboardData(user) {

    try {

        const receipts =
            await getAllReceipts(user);


        const totalByCurrency = {};

        const countByCurrency = {};


        // ==================================
        // CALCULATE TOTALS
        // ==================================

        receipts.forEach(
            function (receipt) {

                const data =
                    receipt.data;

                const amount =
                    getReceiptAmount(
                        data
                    );

                const currency =
                    getReceiptCurrency(
                        data
                    );


                if (
                    !totalByCurrency[
                        currency
                    ]
                ) {

                    totalByCurrency[
                        currency
                    ] = 0;

                }


                if (
                    !countByCurrency[
                        currency
                    ]
                ) {

                    countByCurrency[
                        currency
                    ] = 0;

                }


                totalByCurrency[
                    currency
                ] += amount;


                countByCurrency[
                    currency
                ] += 1;

            }
        );


        const currencies =
            Object.keys(
                totalByCurrency
            );


        // ==================================
        // TOTAL EXPENSE
        // ==================================

        if (totalExpenseElement) {

            if (
                currencies.length === 0
            ) {

                totalExpenseElement.textContent =
                    "--";

                if (totalExpenseNote) {

                    totalExpenseNote.textContent =
                        "No receipts yet";

                }

            }

            else if (
                currencies.length === 1
            ) {

                const currency =
                    currencies[0];

                totalExpenseElement.textContent =
                    formatCurrency(
                        totalByCurrency[
                            currency
                        ],
                        currency
                    );

                if (totalExpenseNote) {

                    totalExpenseNote.textContent =
                        countByCurrency[
                            currency
                        ] +
                        (
                            countByCurrency[
                                currency
                            ] === 1
                                ? " receipt"
                                : " receipts"
                        );

                }

            }

            else {

                totalExpenseElement.textContent =
                    currencies.length +
                    " currencies";

                if (totalExpenseNote) {

                    totalExpenseNote.textContent =
                        "See Currency Summary for totals";

                }

            }

        }


        // ==================================
        // CURRENCY SUMMARY
        // ==================================

        renderCurrencySummary(
            totalByCurrency,
            countByCurrency
        );


        // ==================================
        // UPDATE CHART CURRENCY OPTIONS
        // ==================================

        updateChartCurrencyOptions(
            currencies
        );


        console.log(
            "Original currency totals:",
            totalByCurrency
        );

    }
    catch (error) {

        console.error(
            "Dashboard data error:",
            error
        );

        if (totalExpenseElement) {

            totalExpenseElement.textContent =
                "--";

        }

        if (totalExpenseNote) {

            totalExpenseNote.textContent =
                "Unable to load expense data";

        }

    }
}


// ==========================================
// RENDER CURRENCY SUMMARY
// ==========================================

function renderCurrencySummary(
    totalByCurrency,
    countByCurrency
) {

    if (!currencySummaryList) {
        return;
    }


    const entries =
        Object.entries(
            totalByCurrency
        );


    // ==================================
    // NO DATA
    // ==================================

    if (
        entries.length === 0
    ) {

        currencySummaryList.innerHTML = `
            <div class="currency-summary-empty">
                No receipt data available yet.
            </div>
        `;

        if (currencySummaryText) {

            currencySummaryText.textContent =
                "Your spending by original currency";

        }

        return;
    }


    // ==================================
    // SORT CURRENCIES
    // ==================================

    entries.sort(
        function (a, b) {

            return (
                b[1] - a[1]
            );

        }
    );


    // ==================================
    // SUMMARY DESCRIPTION
    // ==================================

    if (currencySummaryText) {

        currencySummaryText.textContent =
            entries.length === 1
                ? "Your spending in the original currency"
                : "Your spending grouped by original currency";

    }


    currencySummaryList.innerHTML = "";


    // ==================================
    // CREATE SUMMARY ROWS
    // ==================================

    entries.forEach(
        function ([currency, amount]) {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "currency-summary-row";


            const count =
                countByCurrency[
                    currency
                ] || 0;


            row.innerHTML = `
                <div>
                    <strong>
                        ${currency}
                    </strong>

                    <span>
                        ${
                            count
                        }
                        ${
                            count === 1
                                ? "receipt"
                                : "receipts"
                        }
                    </span>
                </div>

                <strong>
                    ${formatCurrency(
                        amount,
                        currency
                    )}
                </strong>
            `;


            currencySummaryList.appendChild(
                row
            );

        }
    );
}


// ==========================================
// UPDATE CHART CURRENCY DROPDOWN
// ==========================================

function updateChartCurrencyOptions(
    currencies
) {

    if (!chartCurrency) {
        return;
    }


    const oldValue =
        chartCurrency.value;


    chartCurrency.innerHTML = "";


    // ==================================
    // ALL CURRENCIES OPTION
    // ==================================

    const allOption =
        document.createElement(
            "option"
        );

    allOption.value =
        "all";

    allOption.textContent =
        "All currencies";

    chartCurrency.appendChild(
        allOption
    );


    // ==================================
    // ADD AVAILABLE CURRENCIES
    // ==================================

    currencies.forEach(
        function (currency) {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                currency;

            option.textContent =
                currency;

            chartCurrency.appendChild(
                option
            );

        }
    );


    // ==================================
    // SELECT PREVIOUS VALUE
    // ==================================

    if (
        currencies.includes(
            oldValue
        )
    ) {

        chartCurrency.value =
            oldValue;

    }

    else if (
        currencies.length === 1
    ) {

        chartCurrency.value =
            currencies[0];

    }

    else {

        chartCurrency.value =
            "all";

    }


    if (currentUser) {

        loadSpendingChart(
            currentUser
        );

    }
}


// ==========================================
// LOAD SPENDING CHART
// ==========================================

async function loadSpendingChart(user) {

    try {

        const receipts =
            await getAllReceipts(
                user
            );


        const selectedPeriod =
            chartSelect
                ? chartSelect.value
                : "6";


        const selectedCurrency =
            chartCurrency
                ? chartCurrency.value
                : "all";


        const today =
            new Date();

        const currentYear =
            today.getFullYear();

        const currentMonth =
            today.getMonth();


        // ==================================
        // FIND AVAILABLE CURRENCIES
        // ==================================

        const currencies = [
            ...new Set(
                receipts.map(
                    function (receipt) {

                        return getReceiptCurrency(
                            receipt.data
                        );

                    }
                )
            )
        ];


        // ==================================
        // MULTIPLE CURRENCY WARNING
        // ==================================

        if (
            selectedCurrency === "all" &&
            currencies.length > 1
        ) {

            renderMultiCurrencyChartMessage();

            return;

        }


        let activeCurrency =
            selectedCurrency;


        if (
            selectedCurrency === "all" &&
            currencies.length === 1
        ) {

            activeCurrency =
                currencies[0];

        }


        if (
            currencies.length === 0
        ) {

            activeCurrency =
                "INR";

        }


        // ==================================
        // CREATE MONTH DATA
        // ==================================

        const monthData = [];


        // ==================================
        // THIS YEAR
        // ==================================

        if (
            selectedPeriod === "12"
        ) {

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
                                month:
                                    "short"
                            }
                        ),

                    amount:
                        0

                });

            }

        }


        // ==================================
        // LAST 6 MONTHS
        // ==================================

        else if (
            selectedPeriod === "6"
        ) {

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
                                month:
                                    "short"
                            }
                        ),

                    amount:
                        0

                });

            }

        }


        // ==================================
        // ALL TIME
        // ==================================

        else if (
            selectedPeriod === "all"
        ) {

            const uniqueMonths = {};


            receipts.forEach(
                function (receipt) {

                    const receiptDate =
                        getReceiptDate(
                            receipt.data
                        );


                    if (!receiptDate) {
                        return;
                    }


                    const key =
                        receiptDate.getFullYear() +
                        "-" +
                        String(
                            receiptDate.getMonth() + 1
                        ).padStart(
                            2,
                            "0"
                        );


                    uniqueMonths[key] = {

                        year:
                            receiptDate.getFullYear(),

                        month:
                            receiptDate.getMonth(),

                        label:
                            receiptDate.toLocaleString(
                                "en-US",
                                {
                                    month:
                                        "short"
                                }
                            ) +
                            " " +
                            receiptDate.getFullYear()

                    };

                }
            );


            Object.values(
                uniqueMonths
            )
                .sort(
                    function (a, b) {

                        if (
                            a.year !==
                            b.year
                        ) {

                            return (
                                a.year -
                                b.year
                            );

                        }

                        return (
                            a.month -
                            b.month
                        );

                    }
                )
                .forEach(
                    function (item) {

                        monthData.push({

                            year:
                                item.year,

                            month:
                                item.month,

                            label:
                                item.label,

                            amount:
                                0

                        });

                    }
                );


            // No receipts
            if (
                monthData.length === 0
            ) {

                monthData.push({

                    year:
                        currentYear,

                    month:
                        currentMonth,

                    label:
                        today.toLocaleString(
                            "en-US",
                            {
                                month:
                                    "short"
                            }
                        ),

                    amount:
                        0

                });

            }

        }


        // ==================================
        // ADD RECEIPTS
        // ==================================

        receipts.forEach(
            function (receipt) {

                const data =
                    receipt.data;


                const receiptDate =
                    getReceiptDate(
                        data
                    );


                if (!receiptDate) {
                    return;
                }


                const currency =
                    getReceiptCurrency(
                        data
                    );


                // Only selected currency
                if (
                    currency !==
                    activeCurrency
                ) {

                    return;

                }


                const amount =
                    getReceiptAmount(
                        data
                    );


                const matchingMonth =
                    monthData.find(
                        function (item) {

                            return (

                                item.year ===
                                receiptDate.getFullYear()

                                &&

                                item.month ===
                                receiptDate.getMonth()

                            );

                        }
                    );


                if (
                    matchingMonth
                ) {

                    matchingMonth.amount +=
                        amount;

                }

            }
        );


        console.log(
            "Chart currency:",
            activeCurrency
        );

        console.log(
            "Chart data:",
            monthData
        );


        updateChart(
            monthData,
            activeCurrency
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
// MULTI-CURRENCY CHART MESSAGE
// ==========================================

function renderMultiCurrencyChartMessage() {

    if (!spendingBars) {
        return;
    }


    spendingBars.innerHTML = `
        <div
            style="
                width:100%;
                min-height:180px;
                display:flex;
                align-items:center;
                justify-content:center;
                text-align:center;
                color:#7b8794;
                padding:20px;
            "
        >
            <div>
                <strong>
                    Select a currency
                </strong>

                <br>

                <span>
                    Different currencies are kept separate
                    and are not converted or combined.
                </span>
            </div>
        </div>
    `;


    updateChartYAxis(
        0,
        "INR"
    );


    if (chartDescription) {

        chartDescription.textContent =
            "Select a currency to view spending";

    }
}


// ==========================================
// UPDATE CHART
// ==========================================

function updateChart(
    monthData,
    currency
) {

    if (!spendingBars) {

        console.error(
            "Chart bars container not found."
        );

        return;

    }


    spendingBars.innerHTML = "";


    // ==================================
    // CHART DESCRIPTION
    // ==================================

    if (chartDescription) {

        chartDescription.textContent =
            "Spending in " +
            currency;

    }


    // ==================================
    // FIND MAXIMUM
    // ==================================

    let maxValue = 0;


    monthData.forEach(
        function (item) {

            if (
                item.amount >
                maxValue
            ) {

                maxValue =
                    item.amount;

            }

        }
    );


    // ==================================
    // CREATE BARS
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
            // BAR HEIGHT
            // ==================================

            let percentage = 0;


            if (
                maxValue > 0
            ) {

                percentage =
                    (
                        item.amount /
                        maxValue
                    ) * 100;

            }


            // Keep small values visible
            if (
                item.amount > 0 &&
                percentage < 8
            ) {

                percentage = 8;

            }


            bar.style.height =
                percentage + "%";


            // ==================================
            // TOOLTIP
            // ==================================

            if (
                item.amount > 0
            ) {

                bar.title =
                    item.label +
                    " - " +
                    formatCurrency(
                        item.amount,
                        currency
                    );

            }
            else {

                bar.title =
                    item.label +
                    " - No spending";

            }


            wrapper.appendChild(
                bar
            );

            wrapper.appendChild(
                label
            );


            spendingBars.appendChild(
                wrapper
            );

        }
    );


    // ==================================
    // UPDATE Y AXIS
    // ==================================

    updateChartYAxis(
        maxValue,
        currency
    );
}


// ==========================================
// UPDATE CHART Y AXIS
// ==========================================

function updateChartYAxis(
    maxValue,
    currency = "INR"
) {

    if (
        !chartY1 ||
        !chartY2 ||
        !chartY3 ||
        !chartY4
    ) {
        return;
    }


    // ==================================
    // NO DATA
    // ==================================

    if (
        maxValue <= 0
    ) {

        chartY1.textContent =
            formatChartValue(
                1000,
                currency
            );

        chartY2.textContent =
            formatChartValue(
                700,
                currency
            );

        chartY3.textContent =
            formatChartValue(
                300,
                currency
            );

        chartY4.textContent =
            formatChartValue(
                0,
                currency
            );

        return;
    }


    // ==================================
    // DYNAMIC SCALE
    // ==================================

    let top;


    if (
        maxValue < 1000
    ) {

        top =
            Math.ceil(
                maxValue / 100
            ) * 100;


        if (
            top < 100
        ) {

            top = 100;

        }

    }

    else if (
        maxValue < 10000
    ) {

        top =
            Math.ceil(
                maxValue / 1000
            ) * 1000;

    }

    else if (
        maxValue < 100000
    ) {

        top =
            Math.ceil(
                maxValue / 5000
            ) * 5000;

    }

    else {

        top =
            Math.ceil(
                maxValue / 25000
            ) * 25000;

    }


    const second =
        top * (2 / 3);

    const third =
        top * (1 / 3);


    chartY1.textContent =
        formatChartValue(
            top,
            currency
        );

    chartY2.textContent =
        formatChartValue(
            second,
            currency
        );

    chartY3.textContent =
        formatChartValue(
            third,
            currency
        );

    chartY4.textContent =
        formatChartValue(
            0,
            currency
        );
}


// ==========================================
// FORMAT CHART VALUE
// ==========================================

function formatChartValue(
    value,
    currency
) {

    const symbol =
        getCurrencySymbol(
            currency
        );


    if (
        value >= 10000000
    ) {

        return (
            symbol +
            (
                value /
                10000000
            ).toFixed(1) +
            "Cr"
        );

    }


    if (
        value >= 100000
    ) {

        return (
            symbol +
            (
                value /
                100000
            ).toFixed(1) +
            "L"
        );

    }


    if (
        value >= 1000
    ) {

        return (
            symbol +
            (
                value /
                1000
            ).toFixed(1) +
            "k"
        );

    }


    return (
        symbol +
        Math.round(value)
    );
}


// ==========================================
// CHART PERIOD DROPDOWN
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
// CHART CURRENCY DROPDOWN
// ==========================================

if (chartCurrency) {

    chartCurrency.addEventListener(
        "change",
        function () {

            console.log(
                "Chart currency changed:",
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


        // ==================================
        // NO RECEIPTS
        // ==================================

        if (
            snapshot.empty
        ) {

            receiptList.innerHTML = `
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


        // ==================================
        // DISPLAY RECEIPTS
        // ==================================

        snapshot.forEach(
            function (docSnapshot) {

                const data =
                    docSnapshot.data();


                const storeName =
                    data.storeName ||
                    "Unknown Store";


                const amount =
                    getReceiptAmount(
                        data
                    );


                const currency =
                    getReceiptCurrency(
                        data
                    );


                const date =
                    getReceiptDate(
                        data
                    );


                let dateText =
                    "Date unavailable";


                if (date) {

                    dateText =
                        date.toLocaleDateString(
                            "en-IN"
                        );

                }


                // ==================================
                // CREATE ROW
                // ==================================

                const row =
                    document.createElement(
                        "div"
                    );


                row.className =
                    "receipt-row";


                row.style.cursor =
                    "pointer";


                row.innerHTML = `
                    <div class="receipt-store-icon">
                        ▣
                    </div>

                    <div class="receipt-info">

                        <strong>
                            ${escapeHTML(
                                storeName
                            )}
                        </strong>

                        <span>
                            ${dateText}
                        </span>

                    </div>

                    <div class="receipt-price">

                        ${formatCurrency(
                            amount,
                            currency
                        )}

                    </div>
                `;


                // ==================================
                // OPEN RECEIPT DETAILS
                // ==================================

                row.addEventListener(
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


        receiptList.innerHTML = `
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
// ESCAPE HTML
// ==========================================

function escapeHTML(value) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
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


            if (profileNameInput) {

                profileNameInput.value =
                    name;

            }


            if (profileEmailInput) {

                profileEmailInput.value =
                    email;

            }


            // ==================================
            // PROFILE IMAGE
            // ==================================

            if (
                currentUser.photoURL &&
                !avatarRemoved
            ) {

                profileAvatar.innerHTML = `
                    <img
                        src="${currentUser.photoURL}"
                        alt="Profile Avatar"
                        style="
                            width:100%;
                            height:100%;
                            object-fit:cover;
                            border-radius:50%;
                        "
                    >
                `;


                profileLargeAvatar.innerHTML = `
                    <img
                        src="${currentUser.photoURL}"
                        alt="Profile Avatar"
                        style="
                            width:100%;
                            height:100%;
                            object-fit:cover;
                            border-radius:50%;
                        "
                    >
                `;

            }

            else {

                const initial =
                    name
                        .charAt(0)
                        .toUpperCase();


                profileAvatar.textContent =
                    initial;


                profileLargeAvatar.textContent =
                    initial;

            }


            if (profileMessage) {

                profileMessage.textContent =
                    "";

                profileMessage.style.color =
                    "";

            }


            selectedAvatarFile =
                null;


            if (avatarInput) {

                avatarInput.value =
                    "";

            }


            // IMPORTANT:
            // Modal uses inline display:none
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


            profileAvatar.innerHTML = `
                <img
                    src="${imageURL}"
                    alt="Profile Avatar"
                    style="
                        width:100%;
                        height:100%;
                        object-fit:cover;
                        border-radius:50%;
                    "
                >
            `;


            profileLargeAvatar.innerHTML = `
                <img
                    src="${imageURL}"
                    alt="Profile Avatar"
                    style="
                        width:100%;
                        height:100%;
                        object-fit:cover;
                        border-radius:50%;
                    "
                >
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

                    }
                    catch (error) {

                        console.log(
                            "No old avatar found."
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
                // UPDATE UI
                // ==================================

                profileName.textContent =
                    newName;


                if (photoURL) {

                    profileAvatar.innerHTML = `
                        <img
                            src="${photoURL}"
                            alt="Profile Avatar"
                            style="
                                width:100%;
                                height:100%;
                                object-fit:cover;
                                border-radius:50%;
                            "
                        >
                    `;


                    profileLargeAvatar.innerHTML = `
                        <img
                            src="${photoURL}"
                            alt="Profile Avatar"
                            style="
                                width:100%;
                                height:100%;
                                object-fit:cover;
                                border-radius:50%;
                            "
                        >
                    `;

                }

                else {

                    const initial =
                        newName
                            .charAt(0)
                            .toUpperCase();


                    profileAvatar.textContent =
                        initial;


                    profileLargeAvatar.textContent =
                        initial;

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
            // PROFILE NAME
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

                    profileAvatar.innerHTML = `
                        <img
                            src="${user.photoURL}"
                            alt="Profile Avatar"
                            style="
                                width:100%;
                                height:100%;
                                object-fit:cover;
                                border-radius:50%;
                            "
                        >
                    `;

                }

                else {

                    profileAvatar.textContent =
                        displayName
                            .charAt(0)
                            .toUpperCase();

                }

            }


            // ==================================
            // LARGE AVATAR
            // ==================================

            if (profileLargeAvatar) {

                if (user.photoURL) {

                    profileLargeAvatar.innerHTML = `
                        <img
                            src="${user.photoURL}"
                            alt="Profile Avatar"
                            style="
                                width:100%;
                                height:100%;
                                object-fit:cover;
                                border-radius:50%;
                            "
                        >
                    `;

                }

                else {

                    profileLargeAvatar.textContent =
                        displayName
                            .charAt(0)
                            .toUpperCase();

                }

            }


            // ==================================
            // PROFILE INPUTS
            // ==================================

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
            // LOAD TOTAL + CURRENCY SUMMARY
            // ==================================

            loadDashboardData(
                user
            );


            // ==================================
            // LOAD RECENT RECEIPTS
            // ==================================

            loadRecentReceipts(
                user
            );


            // ==================================
            // LOAD SPENDING CHART
            // ==================================

            loadSpendingChart(
                user
            );

        }

        else {

            // ==================================
            // NO USER
            // ==================================

            console.log(
                "ℹ️ No user logged in."
            );


            currentUser =
                null;


            if (receiptList) {

                receiptList.innerHTML = `
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