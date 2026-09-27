import { auth, db } from "./firebase.js";

import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


// =====================================================
// DOM ELEMENTS
// =====================================================

const reportPeriod = document.getElementById("reportPeriod");
const fromDate = document.getElementById("fromDate");
const toDate = document.getElementById("toDate");
const fromDateGroup = document.getElementById("fromDateGroup");
const toDateGroup = document.getElementById("toDateGroup");

const reportCurrency = document.getElementById("reportCurrency");
const reportCategory = document.getElementById("reportCategory");

const applyReportBtn = document.getElementById("applyReportBtn");
const resetReportBtn = document.getElementById("resetReportBtn");

const reportTotalExpense = document.getElementById("reportTotalExpense");
const totalExpenseSub = document.getElementById("totalExpenseSub");

const reportReceiptCount = document.getElementById("reportReceiptCount");

const reportTopCategory = document.getElementById("reportTopCategory");
const topCategorySub = document.getElementById("topCategorySub");

const reportAverageExpense = document.getElementById("reportAverageExpense");
const averageExpenseSub = document.getElementById("averageExpenseSub");

const categoryReportList = document.getElementById("categoryReportList");
const reportCurrencyList = document.getElementById("reportCurrencyList");

const chartCurrency = document.getElementById("chartCurrency");
const monthlyReportChart = document.getElementById("monthlyReportChart");
const chartEmpty = document.getElementById("chartEmpty");

const reportRecordCount = document.getElementById("reportRecordCount");
const reportReceiptTable = document.getElementById("reportReceiptTable");
const reportTableEmpty = document.getElementById("reportTableEmpty");

const printReportBtn = document.getElementById("printReportBtn");
const exportReportBtn = document.getElementById("exportReportBtn");

const profileButton = document.getElementById("profileButton");
const profileAvatar = document.getElementById("profileAvatar");
const profileName = document.getElementById("profileName");

const mobileMenuBtn = document.getElementById("mobileMenuBtn");


// =====================================================
// GLOBAL DATA
// =====================================================

let allReceipts = [];
let filteredReceipts = [];


// =====================================================
// CURRENCY SYMBOLS
// =====================================================

const currencySymbols = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
    AED: "د.إ",
    CAD: "C$",
    AUD: "A$"
};


// =====================================================
// CHART COLORS
// =====================================================

const chartColors = [
    "#2563eb",
    "#f97316",
    "#16a34a",
    "#7c3aed",
    "#dc2626",
    "#0891b2",
    "#db2777"
];


// =====================================================
// INITIAL LOAD
// =====================================================

auth.onAuthStateChanged(async (user) => {

    if (!user) {
        window.location.href = "loginpg.html";
        return;
    }

    await loadUserProfile(user);
    await loadReceipts(user);

    populateFilters();
    applyFilters();
});


// =====================================================
// LOAD USER PROFILE
// =====================================================

async function loadUserProfile(user) {

    if (profileName) {

        profileName.textContent =
            user.displayName ||
            user.email?.split("@")[0] ||
            "User";
    }

    if (profileAvatar) {

        profileAvatar.textContent =
            (
                user.displayName ||
                user.email ||
                "U"
            )
                .charAt(0)
                .toUpperCase();
    }
}


// =====================================================
// LOAD RECEIPTS
// =====================================================

async function loadReceipts(user) {

    try {

        const receiptsRef = collection(
            db,
            "users",
            user.uid,
            "receipts"
        );

        const receiptsQuery = query(
            receiptsRef,
            orderBy("createdAt", "desc")
        );

        const snapshot =
            await getDocs(receiptsQuery);

        allReceipts = [];

        snapshot.forEach((doc) => {

            allReceipts.push({
                id: doc.id,
                ...doc.data()
            });
        });

    } catch (error) {

        console.warn(
            "Ordered receipt query failed. Loading without orderBy.",
            error
        );

        try {

            const receiptsRef = collection(
                db,
                "users",
                user.uid,
                "receipts"
            );

            const snapshot =
                await getDocs(receiptsRef);

            allReceipts = [];

            snapshot.forEach((doc) => {

                allReceipts.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

        } catch (fallbackError) {

            console.error(
                "Failed to load receipts:",
                fallbackError
            );

            allReceipts = [];
        }
    }
}


// =====================================================
// POPULATE FILTERS
// =====================================================

function populateFilters() {

    const currencies = [
        ...new Set(
            allReceipts
                .map(receipt =>
                    normalizeCurrency(
                        receipt.currency
                    )
                )
                .filter(Boolean)
        )
    ].sort();

    const categories = [
        ...new Set(
            allReceipts
                .map(receipt =>
                    String(
                        receipt.category || ""
                    ).trim()
                )
                .filter(Boolean)
        )
    ].sort();


    // Currency filter
    if (reportCurrency) {

        reportCurrency.innerHTML =
            `<option value="ALL">All Currencies</option>`;

        currencies.forEach(currency => {

            const option =
                document.createElement("option");

            option.value = currency;
            option.textContent = currency;

            reportCurrency.appendChild(option);
        });
    }


    // Chart currency filter
    if (chartCurrency) {

        chartCurrency.innerHTML =
            `<option value="ALL">All Currencies</option>`;

        currencies.forEach(currency => {

            const option =
                document.createElement("option");

            option.value = currency;
            option.textContent = currency;

            chartCurrency.appendChild(option);
        });
    }


    // Category filter
    if (reportCategory) {

        reportCategory.innerHTML =
            `<option value="ALL">All Categories</option>`;

        categories.forEach(category => {

            const option =
                document.createElement("option");

            option.value = category;
            option.textContent = category;

            reportCategory.appendChild(option);
        });
    }
}


// =====================================================
// PERIOD DATES
// =====================================================

function getPeriodDates() {

    const period =
        reportPeriod?.value || "all";


    if (period === "all") {

        return {
            from: null,
            to: null
        };
    }


    if (period === "custom") {

        return {
            from: fromDate?.value || null,
            to: toDate?.value || null
        };
    }


    const today =
        new Date();

    const startDate =
        new Date(today);


    if (period === "7") {

        startDate.setDate(
            today.getDate() - 7
        );

    } else if (period === "30") {

        startDate.setDate(
            today.getDate() - 30
        );

    } else if (period === "90") {

        startDate.setDate(
            today.getDate() - 90
        );

    } else if (period === "365") {

        startDate.setDate(
            today.getDate() - 365
        );
    }


    return {
        from: formatDateForInput(startDate),
        to: formatDateForInput(today)
    };
}


// =====================================================
// DATE HELPERS
// =====================================================

function formatDateForInput(date) {

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");


    return `${year}-${month}-${day}`;
}


function normalizeDate(value) {

    if (!value) {
        return null;
    }


    // Firestore Timestamp
    if (
        typeof value.toDate === "function"
    ) {

        const date =
            value.toDate();

        return isNaN(date.getTime())
            ? null
            : date;
    }


    if (value instanceof Date) {

        return isNaN(value.getTime())
            ? null
            : value;
    }


    if (typeof value !== "string") {
        return null;
    }


    const text =
        value.trim();


    // YYYY-MM-DD
    let match =
        text.match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );


    if (match) {

        const date =
            new Date(
                Number(match[1]),
                Number(match[2]) - 1,
                Number(match[3])
            );

        return isNaN(date.getTime())
            ? null
            : date;
    }


    // DD-MM-YYYY or DD/MM/YYYY
    match =
        text.match(
            /^(\d{2})[-/](\d{2})[-/](\d{4})$/
        );


    if (match) {

        const date =
            new Date(
                Number(match[3]),
                Number(match[2]) - 1,
                Number(match[1])
            );

        return isNaN(date.getTime())
            ? null
            : date;
    }


    // Normal JS date string
    const parsed =
        new Date(text);


    return isNaN(parsed.getTime())
        ? null
        : parsed;
}


// =====================================================
// APPLY FILTERS
// =====================================================

function applyFilters() {

    const periodDates =
        getPeriodDates();

    const selectedCurrency =
        reportCurrency?.value || "ALL";

    const selectedCategory =
        reportCategory?.value || "ALL";


    filteredReceipts =
        allReceipts.filter(receipt => {

            const receiptDate =
                normalizeDate(
                    receipt.purchaseDate
                );


            // -----------------------------
            // Date filter
            // -----------------------------

            let dateMatch = true;


            if (
                periodDates.from &&
                receiptDate
            ) {

                const from =
                    new Date(
                        periodDates.from
                    );

                from.setHours(
                    0,
                    0,
                    0,
                    0
                );


                dateMatch =
                    receiptDate >= from;
            }


            if (
                dateMatch &&
                periodDates.to &&
                receiptDate
            ) {

                const to =
                    new Date(
                        periodDates.to
                    );

                to.setHours(
                    23,
                    59,
                    59,
                    999
                );


                dateMatch =
                    receiptDate <= to;
            }


            // -----------------------------
            // Currency filter
            // -----------------------------

            const receiptCurrency =
                normalizeCurrency(
                    receipt.currency
                );


            const currencyMatch =
                selectedCurrency === "ALL" ||
                receiptCurrency ===
                    selectedCurrency;


            // -----------------------------
            // Category filter
            // -----------------------------

            const receiptCategory =
                String(
                    receipt.category || ""
                ).trim();


            const categoryMatch =
                selectedCategory === "ALL" ||
                receiptCategory ===
                    selectedCategory;


            return (
                dateMatch &&
                currencyMatch &&
                categoryMatch
            );
        });


    renderReport();
}


// =====================================================
// RENDER REPORT
// =====================================================

function renderReport() {

    renderSummary();
    renderCategoryReport();
    renderCurrencySummary();
    renderBarChart();
    renderReceiptTable();
    updatePrintHeader();
}


// =====================================================
// SUMMARY
// =====================================================

function renderSummary() {

    const receiptCount =
        filteredReceipts.length;


    if (reportReceiptCount) {

        reportReceiptCount.textContent =
            receiptCount;
    }


    const currencyGroups =
        groupByCurrency(
            filteredReceipts
        );


    const currencies =
        Object.keys(currencyGroups);


    // -----------------------------------------
    // TOTAL SPENDING
    // -----------------------------------------

    if (reportTotalExpense) {

        if (currencies.length === 0) {

            reportTotalExpense.innerHTML =
                `<span class="summary-empty">—</span>`;

        } else if (currencies.length === 1) {

            const currency =
                currencies[0];

            const total =
                currencyGroups[
                    currency
                ].total;


            reportTotalExpense.textContent =
                formatCurrency(
                    total,
                    currency
                );

        } else {

            // Show each currency separately
            reportTotalExpense.innerHTML =
                currencies
                    .map(currency => {

                        const total =
                            currencyGroups[
                                currency
                            ].total;

                        return `
                            <div class="multi-amount">
                                <strong>
                                    ${formatCurrency(
                                        total,
                                        currency
                                    )}
                                </strong>

                                <small>
                                    ${escapeHTML(currency)}
                                </small>
                            </div>
                        `;
                    })
                    .join("");
        }
    }


    if (totalExpenseSub) {

        if (currencies.length === 0) {

            totalExpenseSub.textContent =
                "No spending recorded";

        } else if (currencies.length === 1) {

            totalExpenseSub.textContent =
                `${receiptCount} receipt${receiptCount === 1 ? "" : "s"}`;

        } else {

            totalExpenseSub.textContent =
                "Original amounts • No currency conversion";
        }
    }


    // -----------------------------------------
    // AVERAGE RECEIPT
    // -----------------------------------------

    if (reportAverageExpense) {

        if (currencies.length === 0) {

            reportAverageExpense.innerHTML =
                `<span class="summary-empty">—</span>`;

        } else {

            reportAverageExpense.innerHTML =
                currencies
                    .map(currency => {

                        const data =
                            currencyGroups[
                                currency
                            ];

                        const average =
                            data.count > 0
                                ? data.total /
                                  data.count
                                : 0;

                        return `
                            <div class="multi-amount">
                                <strong>
                                    ${formatCurrency(
                                        average,
                                        currency
                                    )}
                                </strong>

                                <small>
                                    ${escapeHTML(currency)}
                                </small>
                            </div>
                        `;
                    })
                    .join("");
        }
    }


    if (averageExpenseSub) {

        if (currencies.length === 0) {

            averageExpenseSub.textContent =
                "No receipt data";

        } else {

            averageExpenseSub.textContent =
                "Average per receipt • Original currency";
        }
    }


    // -----------------------------------------
    // TOP CATEGORY
    // -----------------------------------------

    renderTopCategory(
        currencyGroups
    );
}


// =====================================================
// TOP CATEGORY
// =====================================================

function renderTopCategory(
    currencyGroups
) {

    if (!reportTopCategory) {
        return;
    }


    /*
        Important:
        We DO NOT compare ₹, €, $, etc.
        as if they were the same currency.
    */


    const selectedCurrency =
        reportCurrency?.value || "ALL";


    if (
        selectedCurrency !== "ALL" &&
        currencyGroups[selectedCurrency]
    ) {

        const categoryTotals =
            getCategoryTotals(
                filteredReceipts.filter(
                    receipt =>
                        normalizeCurrency(
                            receipt.currency
                        ) === selectedCurrency
                )
            );


        const top =
            getTopCategory(
                categoryTotals
            );


        reportTopCategory.textContent =
            top?.category || "—";


        if (topCategorySub) {

            topCategorySub.textContent =
                top
                    ? `${formatCurrency(
                        top.total,
                        selectedCurrency
                    )} • ${selectedCurrency}`
                    : "No category data";
        }


        return;
    }


    // Multiple currencies
    const currencyNames =
        Object.keys(currencyGroups);


    if (currencyNames.length === 0) {

        reportTopCategory.textContent =
            "—";

        if (topCategorySub) {
            topCategorySub.textContent =
                "No category data";
        }

        return;
    }


    if (currencyNames.length === 1) {

        const currency =
            currencyNames[0];


        const categoryTotals =
            getCategoryTotals(
                filteredReceipts
            );


        const top =
            getTopCategory(
                categoryTotals
            );


        reportTopCategory.textContent =
            top?.category || "—";


        if (topCategorySub) {

            topCategorySub.textContent =
                top
                    ? `${formatCurrency(
                        top.total,
                        currency
                    )} • ${currency}`
                    : "No category data";
        }

        return;
    }


    /*
        When multiple currencies exist,
        we don't falsely declare one category
        as globally highest.

        Instead show:
        "Multiple"
    */

    reportTopCategory.textContent =
        "By Currency";


    if (topCategorySub) {

        topCategorySub.textContent =
            "Category totals are kept separate by currency";
    }
}


// =====================================================
// CATEGORY TOTALS
// =====================================================

function getCategoryTotals(
    receipts
) {

    const totals = {};


    receipts.forEach(receipt => {

        const category =
            String(
                receipt.category ||
                "Other"
            ).trim();


        if (!totals[category]) {
            totals[category] = 0;
        }


        totals[category] +=
            Number(
                receipt.totalAmount || 0
            );
    });


    return totals;
}


// =====================================================
// GET TOP CATEGORY
// =====================================================

function getTopCategory(
    categoryTotals
) {

    const entries =
        Object.entries(
            categoryTotals
        );


    if (entries.length === 0) {
        return null;
    }


    entries.sort(
        (a, b) => b[1] - a[1]
    );


    return {
        category: entries[0][0],
        total: entries[0][1]
    };
}


// =====================================================
// CATEGORY REPORT
// =====================================================

function renderCategoryReport() {

    if (!categoryReportList) {
        return;
    }


    categoryReportList.innerHTML = "";


    if (filteredReceipts.length === 0) {

        categoryReportList.innerHTML =
            `<div class="empty-report">
                No category data available.
            </div>`;

        return;
    }


    /*
        Group by CATEGORY + CURRENCY.

        Example:
        Grocery + INR
        Grocery + EUR

        will remain separate.
    */

    const categoryData = {};


    filteredReceipts.forEach(receipt => {

        const category =
            String(
                receipt.category ||
                "Other"
            ).trim();


        const currency =
            normalizeCurrency(
                receipt.currency
            );


        const key =
            `${category}__${currency}`;


        if (!categoryData[key]) {

            categoryData[key] = {
                category,
                currency,
                total: 0
            };
        }


        categoryData[key].total +=
            Number(
                receipt.totalAmount || 0
            );
    });


    const entries =
        Object.values(
            categoryData
        ).sort(
            (a, b) =>
                a.category.localeCompare(
                    b.category
                ) ||
                b.total - a.total
        );


    /*
        Find max ONLY for visual bar width.
        It is not used to compare currencies.
    */

    const groupsByCurrency = {};


    entries.forEach(item => {

        if (!groupsByCurrency[item.currency]) {

            groupsByCurrency[
                item.currency
            ] = [];
        }


        groupsByCurrency[
            item.currency
        ].push(item);
    });


    Object.keys(groupsByCurrency)
        .sort()
        .forEach(currency => {

            const currencyItems =
                groupsByCurrency[
                    currency
                ];


            const maxAmount =
                Math.max(
                    ...currencyItems.map(
                        item => item.total
                    ),
                    1
                );


            currencyItems
                .sort(
                    (a, b) =>
                        b.total - a.total
                )
                .forEach(item => {

                    const row =
                        document.createElement(
                            "div"
                        );


                    row.className =
                        "category-report-row";


                    const percentage =
                        Math.max(
                            4,
                            (
                                item.total /
                                maxAmount
                            ) * 100
                        );


                    row.innerHTML = `

                        <div class="category-report-info">

                            <div class="category-name-block">

                                <strong>
                                    ${escapeHTML(
                                        item.category
                                    )}
                                </strong>

                                <small>
                                    ${escapeHTML(
                                        item.currency
                                    )}
                                </small>

                            </div>

                            <strong>
                                ${formatCurrency(
                                    item.total,
                                    item.currency
                                )}
                            </strong>

                        </div>

                        <div class="category-progress">

                            <div
                                class="category-progress-fill"
                                style="width:${percentage}%"
                            ></div>

                        </div>
                    `;


                    categoryReportList.appendChild(
                        row
                    );
                });
        });
}


// =====================================================
// CURRENCY SUMMARY
// =====================================================

function renderCurrencySummary() {

    if (!reportCurrencyList) {
        return;
    }


    reportCurrencyList.innerHTML = "";


    const currencyGroups =
        groupByCurrency(
            filteredReceipts
        );


    const currencies =
        Object.keys(
            currencyGroups
        ).sort();


    if (currencies.length === 0) {

        reportCurrencyList.innerHTML =
            `<div class="empty-report">
                No currency data available.
            </div>`;

        return;
    }


    currencies.forEach(currency => {

        const data =
            currencyGroups[
                currency
            ];


        const row =
            document.createElement(
                "div"
            );


        row.className =
            "currency-summary-item";


        const symbol =
            currencySymbols[currency] ||
            currency;


        row.innerHTML = `

            <div class="currency-summary-left">

                <div class="currency-icon">
                    ${escapeHTML(symbol)}
                </div>

                <div>

                    <strong>
                        ${escapeHTML(currency)}
                    </strong>

                    <small>
                        ${data.count}
                        receipt${data.count === 1 ? "" : "s"}
                    </small>

                </div>

            </div>

            <strong class="currency-total">
                ${formatCurrency(
                    data.total,
                    currency
                )}
            </strong>

        `;


        reportCurrencyList.appendChild(
            row
        );
    });
}


// =====================================================
// GROUP BY CURRENCY
// =====================================================

function groupByCurrency(
    receipts
) {

    const groups = {};


    receipts.forEach(receipt => {

        const currency =
            normalizeCurrency(
                receipt.currency
            );


        if (!groups[currency]) {

            groups[currency] = {
                count: 0,
                total: 0
            };
        }


        groups[currency].count++;

        groups[currency].total +=
            Number(
                receipt.totalAmount || 0
            );
    });


    return groups;
}


// =====================================================
// BAR CHART
// =====================================================

function renderBarChart() {

    if (!monthlyReportChart) {
        return;
    }


    monthlyReportChart.innerHTML = "";


    if (chartEmpty) {
        chartEmpty.style.display = "none";
    }


    const selectedCurrency =
        chartCurrency?.value || "ALL";


    let receiptsForChart =
        filteredReceipts;


    if (
        selectedCurrency !== "ALL"
    ) {

        receiptsForChart =
            filteredReceipts.filter(
                receipt =>
                    normalizeCurrency(
                        receipt.currency
                    ) ===
                    selectedCurrency
            );
    }


    if (receiptsForChart.length === 0) {

        showChartEmpty(
            "No monthly spending data available."
        );

        return;
    }


    const currencies = [
        ...new Set(
            receiptsForChart.map(
                receipt =>
                    normalizeCurrency(
                        receipt.currency
                    )
            )
        )
    ].sort();


    const monthKeys =
        getMonthKeysForChart(
            receiptsForChart
        );


    if (monthKeys.length === 0) {

        showChartEmpty(
            "No valid purchase dates available."
        );

        return;
    }


    const series =
        currencies.map(currency => {

            return {

                currency,

                values:
                    monthKeys.map(
                        monthKey =>
                            getMonthlyAmount(
                                receiptsForChart,
                                monthKey,
                                currency
                            )
                    )
            };
        });


    createBarChart(
        monthlyReportChart,
        monthKeys,
        series
    );
}


// =====================================================
// SHOW CHART EMPTY
// =====================================================

function showChartEmpty(
    message
) {

    if (!chartEmpty) {
        return;
    }


    chartEmpty.textContent =
        message;

    chartEmpty.style.display =
        "block";
}


// =====================================================
// MONTH KEYS
// =====================================================

function getMonthKeysForChart(
    receipts
) {

    const keys =
        new Set();


    receipts.forEach(receipt => {

        const date =
            normalizeDate(
                receipt.purchaseDate
            );


        if (!date) {
            return;
        }


        const key =
            `${date.getFullYear()}-${String(
                date.getMonth() + 1
            ).padStart(2, "0")}`;


        keys.add(key);
    });


    return [...keys].sort();
}


// =====================================================
// MONTHLY AMOUNT
// =====================================================

function getMonthlyAmount(
    receipts,
    monthKey,
    currency
) {

    return receipts.reduce(
        (sum, receipt) => {

            const date =
                normalizeDate(
                    receipt.purchaseDate
                );


            if (!date) {
                return sum;
            }


            const receiptMonth =
                `${date.getFullYear()}-${String(
                    date.getMonth() + 1
                ).padStart(2, "0")}`;


            const receiptCurrency =
                normalizeCurrency(
                    receipt.currency
                );


            if (
                receiptMonth === monthKey &&
                receiptCurrency === currency
            ) {

                return (
                    sum +
                    Number(
                        receipt.totalAmount || 0
                    )
                );
            }


            return sum;
        },
        0
    );
}


// =====================================================
// CREATE BAR CHART
// =====================================================

function createBarChart(
    container,
    monthKeys,
    series
) {

    container.innerHTML = "";


    const wrapper =
        document.createElement(
            "div"
        );

    wrapper.className =
        "bar-chart-wrapper";


    const chartArea =
        document.createElement(
            "div"
        );

    chartArea.className =
        "bar-chart-area";


    // SVG dimensions
    const width = 1000;
    const height = 430;

    const paddingLeft = 75;
    const paddingRight = 35;
    const paddingTop = 25;
    const paddingBottom = 80;


    const chartWidth =
        width -
        paddingLeft -
        paddingRight;


    const chartHeight =
        height -
        paddingTop -
        paddingBottom;


    // -----------------------------------------
    // Find maximum
    // -----------------------------------------

    let maxValue = 0;


    series.forEach(item => {

        item.values.forEach(value => {

            if (value > maxValue) {
                maxValue = value;
            }
        });
    });


    if (maxValue <= 0) {
        maxValue = 100;
    }


    const scaleStep =
        calculateChartStep(
            maxValue
        );


    const chartMax =
        Math.ceil(
            maxValue /
            scaleStep
        ) * scaleStep;


    // -----------------------------------------
    // SVG
    // -----------------------------------------

    const svg =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
        );


    svg.setAttribute(
        "viewBox",
        `0 0 ${width} ${height}`
    );


    svg.setAttribute(
        "preserveAspectRatio",
        "xMidYMid meet"
    );


    svg.classList.add(
        "bar-chart-svg"
    );


    // -----------------------------------------
    // Y axis + grid
    // -----------------------------------------

    const gridCount = 5;


    for (
        let i = 0;
        i <= gridCount;
        i++
    ) {

        const value =
            chartMax -
            (
                chartMax /
                gridCount
            ) * i;


        const y =
            paddingTop +
            (
                chartHeight /
                gridCount
            ) * i;


        const line =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "line"
            );


        line.setAttribute(
            "x1",
            paddingLeft
        );

        line.setAttribute(
            "x2",
            width - paddingRight
        );

        line.setAttribute(
            "y1",
            y
        );

        line.setAttribute(
            "y2",
            y
        );

        line.setAttribute(
            "stroke",
            "#e5e7eb"
        );

        line.setAttribute(
            "stroke-width",
            "1"
        );


        svg.appendChild(line);


        const label =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "text"
            );


        label.setAttribute(
            "x",
            paddingLeft - 12
        );

        label.setAttribute(
            "y",
            y + 4
        );

        label.setAttribute(
            "text-anchor",
            "end"
        );

        label.setAttribute(
            "font-size",
            "12"
        );

        label.setAttribute(
            "fill",
            "#64748b"
        );


        label.textContent =
            formatCompactNumber(
                value
            );


        svg.appendChild(
            label
        );
    }


    // -----------------------------------------
    // X axis
    // -----------------------------------------

    const axis =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "line"
        );


    axis.setAttribute(
        "x1",
        paddingLeft
    );

    axis.setAttribute(
        "x2",
        width - paddingRight
    );

    axis.setAttribute(
        "y1",
        paddingTop + chartHeight
    );

    axis.setAttribute(
        "y2",
        paddingTop + chartHeight
    );

    axis.setAttribute(
        "stroke",
        "#94a3b8"
    );

    axis.setAttribute(
        "stroke-width",
        "1"
    );


    svg.appendChild(axis);


    // -----------------------------------------
    // Bar sizing
    // -----------------------------------------

    const groupWidth =
        chartWidth /
        monthKeys.length;


    const seriesCount =
        series.length;


    const availableGroupWidth =
        groupWidth * 0.68;


    const barWidth =
        Math.min(
            48,
            availableGroupWidth /
                Math.max(
                    seriesCount,
                    1
                )
        );


    // -----------------------------------------
    // Bars
    // -----------------------------------------

    monthKeys.forEach(
        (monthKey, monthIndex) => {

            const groupStart =
                paddingLeft +
                groupWidth *
                monthIndex;


            const groupCenter =
                groupStart +
                groupWidth / 2;


            series.forEach(
                (item, seriesIndex) => {

                    const value =
                        item.values[
                            monthIndex
                        ] || 0;


                    if (value <= 0) {
                        return;
                    }


                    const barHeight =
                        chartHeight *
                        (
                            value /
                            chartMax
                        );


                    const totalBarsWidth =
                        seriesCount *
                        barWidth;


                    const x =
                        groupCenter -
                        totalBarsWidth / 2 +
                        seriesIndex *
                        barWidth;


                    const y =
                        paddingTop +
                        chartHeight -
                        barHeight;


                    const bar =
                        document.createElementNS(
                            "http://www.w3.org/2000/svg",
                            "rect"
                        );


                    bar.setAttribute(
                        "x",
                        x + 2
                    );

                    bar.setAttribute(
                        "y",
                        y
                    );

                    bar.setAttribute(
                        "width",
                        Math.max(
                            8,
                            barWidth - 5
                        )
                    );

                    bar.setAttribute(
                        "height",
                        barHeight
                    );

                    bar.setAttribute(
                        "rx",
                        "5"
                    );

                    bar.setAttribute(
                        "fill",
                        chartColors[
                            seriesIndex %
                            chartColors.length
                        ]
                    );


                    const title =
                        document.createElementNS(
                            "http://www.w3.org/2000/svg",
                            "title"
                        );


                    title.textContent =
                        `${formatMonth(monthKey)} • ${item.currency}: ${formatCurrency(
                            value,
                            item.currency
                        )}`;


                    bar.appendChild(
                        title
                    );


                    svg.appendChild(
                        bar
                    );
                }
            );


            // Month label
            const monthLabel =
                document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "text"
                );


            monthLabel.setAttribute(
                "x",
                groupCenter
            );

            monthLabel.setAttribute(
                "y",
                paddingTop +
                chartHeight +
                32
            );

            monthLabel.setAttribute(
                "text-anchor",
                "middle"
            );

            monthLabel.setAttribute(
                "font-size",
                "12"
            );

            monthLabel.setAttribute(
                "fill",
                "#64748b"
            );


            monthLabel.textContent =
                formatMonth(
                    monthKey
                );


            svg.appendChild(
                monthLabel
            );
        }
    );


    chartArea.appendChild(
        svg
    );


    // -----------------------------------------
    // Legend
    // -----------------------------------------

    const legend =
        document.createElement(
            "div"
        );


    legend.className =
        "bar-chart-legend";


    series.forEach(
        (item, index) => {

            const legendItem =
                document.createElement(
                    "div"
                );


            legendItem.className =
                "bar-legend-item";


            const dot =
                document.createElement(
                    "span"
                );


            dot.className =
                "bar-legend-dot";


            dot.style.background =
                chartColors[
                    index %
                    chartColors.length
                ];


            const text =
                document.createElement(
                    "span"
                );


            text.textContent =
                item.currency;


            legendItem.appendChild(
                dot
            );

            legendItem.appendChild(
                text
            );


            legend.appendChild(
                legendItem
            );
        }
    );


    wrapper.appendChild(
        chartArea
    );


    wrapper.appendChild(
        legend
    );


    container.appendChild(
        wrapper
    );
}


// =====================================================
// CHART SCALE
// =====================================================

function calculateChartStep(
    maxValue
) {

    if (maxValue <= 100) {
        return 20;
    }

    if (maxValue <= 500) {
        return 100;
    }

    if (maxValue <= 1000) {
        return 200;
    }

    if (maxValue <= 5000) {
        return 1000;
    }

    if (maxValue <= 10000) {
        return 2000;
    }

    if (maxValue <= 50000) {
        return 10000;
    }

    if (maxValue <= 100000) {
        return 20000;
    }


    return Math.pow(
        10,
        Math.floor(
            Math.log10(
                maxValue
            )
        )
    );
}


// =====================================================
// FORMAT MONTH
// =====================================================

function formatMonth(
    monthKey
) {

    const [
        year,
        month
    ] =
        monthKey.split("-");


    const date =
        new Date(
            Number(year),
            Number(month) - 1,
            1
        );


    return date.toLocaleDateString(
        "en-IN",
        {
            month: "short",
            year: "2-digit"
        }
    );
}


// =====================================================
// COMPACT NUMBER
// =====================================================

function formatCompactNumber(
    value
) {

    if (value >= 1000000) {

        return (
            (value / 1000000)
                .toFixed(1)
                .replace(".0", "") +
            "M"
        );
    }


    if (value >= 1000) {

        return (
            (value / 1000)
                .toFixed(1)
                .replace(".0", "") +
            "K"
        );
    }


    return Math.round(
        value
    ).toString();
}


// =====================================================
// RECEIPT TABLE
// =====================================================

function renderReceiptTable() {

    if (!reportReceiptTable) {
        return;
    }


    reportReceiptTable.innerHTML = "";


    if (reportRecordCount) {

        reportRecordCount.textContent =
            `${filteredReceipts.length} record${
                filteredReceipts.length === 1
                    ? ""
                    : "s"
            }`;
    }


    if (filteredReceipts.length === 0) {

        if (reportTableEmpty) {
            reportTableEmpty.style.display =
                "block";
        }

        return;
    }


    if (reportTableEmpty) {
        reportTableEmpty.style.display =
            "none";
    }


    filteredReceipts.forEach(
        receipt => {

            const row =
                document.createElement(
                    "tr"
                );


            const date =
                normalizeDate(
                    receipt.purchaseDate
                );


            const dateText =
                date
                    ? date.toLocaleDateString(
                        "en-IN",
                        {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                        }
                    )
                    : "—";


            const currency =
                normalizeCurrency(
                    receipt.currency
                );


            row.innerHTML = `

                <td>
                    ${escapeHTML(
                        receipt.storeName ||
                        "Unknown Store"
                    )}
                </td>

                <td>
                    ${dateText}
                </td>

                <td>
                    ${escapeHTML(
                        receipt.category ||
                        "Other"
                    )}
                </td>

                <td>
                    ${formatCurrency(
                        Number(
                            receipt.totalAmount ||
                            0
                        ),
                        currency
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        currency
                    )}
                </td>

                <td>
                    ${
                        Array.isArray(receipt.items)
                        ? receipt.items.length
                        : 0
                    }
                    item${
                    Array.isArray(receipt.items) &&
                    receipt.items.length === 1
                    ? ""
                    : "s"
                    }
                </td>

            `;


            reportReceiptTable.appendChild(
                row
            );
        }
    );
}


// =====================================================
// PRINT HEADER
// =====================================================

function updatePrintHeader() {

    const periodElement =
        document.getElementById(
            "printReportPeriod"
        );

    const dateElement =
        document.getElementById(
            "printGeneratedDate"
        );

    const currencyElement =
        document.getElementById(
            "printReportCurrency"
        );


    if (periodElement) {

        const selected =
            reportPeriod
                ?.selectedOptions?.[0];


        periodElement.textContent =
            selected
                ? selected.textContent
                : "All Time";
    }


    if (dateElement) {

        dateElement.textContent =
            new Date().toLocaleDateString(
                "en-IN",
                {
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                }
            );
    }


    if (currencyElement) {

        currencyElement.textContent =
            reportCurrency
                ?.selectedOptions?.[0]
                ?.textContent ||
            "All Currencies";
    }
}


// =====================================================
// PRINT
// =====================================================

if (printReportBtn) {

    printReportBtn.addEventListener(
        "click",
        () => {

            updatePrintHeader();

            window.print();
        }
    );
}


// =====================================================
// EXPORT CSV
// =====================================================

if (exportReportBtn) {

    exportReportBtn.addEventListener(
        "click",
        exportCSV
    );
}


function exportCSV() {

    if (
        filteredReceipts.length === 0
    ) {

        alert(
            "There is no report data to export."
        );

        return;
    }


    const rows = [
        [
            "Store",
            "Date",
            "Category",
            "Amount",
            "Currency"
        ]
    ];


    filteredReceipts.forEach(
        receipt => {

            const date =
                normalizeDate(
                    receipt.purchaseDate
                );


            rows.push([
                receipt.storeName ||
                    "Unknown Store",

                date
                    ? date.toLocaleDateString(
                        "en-IN"
                    )
                    : "",

                receipt.category ||
                    "Other",

                receipt.totalAmount ||
                    0,

                normalizeCurrency(
                    receipt.currency
                )
            ]);
        }
    );


    const csv =
        rows
            .map(row =>
                row
                    .map(value =>
                        `"${String(value)
                            .replace(
                                /"/g,
                                '""'
                            )}"`
                    )
                    .join(",")
            )
            .join("\n");


    const blob =
        new Blob(
            [csv],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href = url;

    link.download =
        `SHOPIX_Report_${formatDateForInput(
            new Date()
        )}.csv`;


    document.body.appendChild(
        link
    );

    link.click();

    document.body.removeChild(
        link
    );

    URL.revokeObjectURL(
        url
    );
}


// =====================================================
// PERIOD UI
// =====================================================

if (reportPeriod) {

    reportPeriod.addEventListener(
        "change",
        () => {

            const custom =
                reportPeriod.value ===
                "custom";


            if (fromDateGroup) {

                fromDateGroup.style.display =
                    custom
                        ? "block"
                        : "none";
            }


            if (toDateGroup) {

                toDateGroup.style.display =
                    custom
                        ? "block"
                        : "none";
            }
        }
    );
}


// =====================================================
// APPLY
// =====================================================

if (applyReportBtn) {

    applyReportBtn.addEventListener(
        "click",
        () => {

            applyFilters();
        }
    );
}


// =====================================================
// RESET
// =====================================================

if (resetReportBtn) {

    resetReportBtn.addEventListener(
        "click",
        () => {

            if (reportPeriod) {
                reportPeriod.value =
                    "all";
            }

            if (reportCurrency) {
                reportCurrency.value =
                    "ALL";
            }

            if (reportCategory) {
                reportCategory.value =
                    "ALL";
            }

            if (chartCurrency) {
                chartCurrency.value =
                    "ALL";
            }

            if (fromDate) {
                fromDate.value = "";
            }

            if (toDate) {
                toDate.value = "";
            }

            if (fromDateGroup) {
                fromDateGroup.style.display =
                    "none";
            }

            if (toDateGroup) {
                toDateGroup.style.display =
                    "none";
            }

            applyFilters();
        }
    );
}


// =====================================================
// CHART FILTER
// =====================================================

if (chartCurrency) {

    chartCurrency.addEventListener(
        "change",
        () => {

            renderBarChart();
        }
    );
}


// =====================================================
// MOBILE MENU
// =====================================================

if (mobileMenuBtn) {

    mobileMenuBtn.addEventListener(
        "click",
        () => {

            const sidebar =
                document.querySelector(
                    ".sidebar"
                );


            if (sidebar) {

                sidebar.classList.toggle(
                    "mobile-open"
                );
            }
        }
    );
}


// =====================================================
// PROFILE
// =====================================================

if (profileButton) {

    profileButton.addEventListener(
        "click",
        () => {

            window.location.href =
                "settings.html";
        }
    );
}


// =====================================================
// NORMALIZE CURRENCY
// =====================================================

function normalizeCurrency(
    currency
) {

    if (!currency) {
        return "INR";
    }


    return String(
        currency
    )
        .trim()
        .toUpperCase();
}


// =====================================================
// FORMAT CURRENCY
// =====================================================

function formatCurrency(
    amount,
    currency
) {

    const normalized =
        normalizeCurrency(
            currency
        );


    const symbol =
        currencySymbols[
            normalized
        ] ||
        normalized;


    const numericAmount =
        Number(amount) || 0;


    return (
        symbol +
        numericAmount.toLocaleString(
            "en-IN",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        )
    );
}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(
    value
) {

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