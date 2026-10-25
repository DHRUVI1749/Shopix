// ==========================================
// SHOPIX - Expense Tracking & Analytics
//
// Every amount is kept in the currency it was
// saved with. Totals are grouped by currency
// and are never converted or combined.
// ==========================================

import {
    auth,
    db
} from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
    OTHER_CURRENCY,
    normalizeCurrency,
    formatCurrency,
    getCurrencyLabel,
    compareCurrencies
} from "./currency.js";

import {
    parseAmount,
    parseReceiptDate,
    filterExpenseRecords,
    groupByCurrency,
    getCategoryTotals,
    isInMonth,
    sortExpenseRecords,
    formatExpenseDate
} from "./expense-utils.js";


// ==========================================
// STATE
// ==========================================

let receipts = [];
let filteredReceipts = [];

let monthlyChart = null;
let categoryChart = null;

const CHART_COLORS = [
    "#2563eb",
    "#7c3aed",
    "#0891b2",
    "#d97706",
    "#16a34a",
    "#dc2626",
    "#db2777",
    "#64748b"
];


// ==========================================
// HELPERS
// ==========================================

function getFilterSelects() {

    return {
        currency: document.getElementById("expenseCurrencyFilter"),
        category: document.getElementById("expenseCategoryFilter"),
        from: document.getElementById("expenseFromDate"),
        to: document.getElementById("expenseToDate")
    };
}


function readFilters() {

    const selects = getFilterSelects();

    return {
        currency: selects.currency ? selects.currency.value : "ALL",
        category: selects.category ? selects.category.value : "ALL",
        from: selects.from ? selects.from.value : "",
        to: selects.to ? selects.to.value : ""
    };
}


function renderEmpty(container, message) {

    if (!container) {
        return;
    }

    const empty = document.createElement("div");

    empty.className = "expense-empty";
    empty.textContent = message;

    container.replaceChildren(empty);
}


function normalizeReceipt(rawReceipt, id) {

    const category =
        String(rawReceipt.category || "").trim() ||
        "Other";

    return {
        ...rawReceipt,
        id,
        storeName:
            String(rawReceipt.storeName || "").trim(),
        category,
        currency:
            normalizeCurrency(rawReceipt.currency),
        totalAmount:
            parseAmount(rawReceipt.totalAmount),
        dateObj:
            parseReceiptDate(rawReceipt.purchaseDate)
    };
}


function pluralize(count, word) {

    return (
        count +
        " " +
        word +
        (count === 1 ? "" : "s")
    );
}


function getChartCurrency(groups) {

    if (groups.length === 1) {
        return groups[0].currency;
    }

    return null;
}


function getCurrencyDisplayCode(currency) {

    return currency === OTHER_CURRENCY ?
        "OTHER" :
        currency;
}


function formatChartTick(value, currency) {

    if (currency === OTHER_CURRENCY) {

        return new Intl.NumberFormat("en-IN", {
            notation: "compact",
            maximumFractionDigits: 1
        }).format(value);
    }

    try {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency,
            currencyDisplay: "narrowSymbol",
            notation: "compact",
            maximumFractionDigits: 1
        }).format(value);
    }
    catch (error) {
        return new Intl.NumberFormat("en-IN", {
            notation: "compact",
            maximumFractionDigits: 1
        }).format(value);
    }
}


// ==========================================
// RENDER SUMMARY CARDS
// ==========================================

function renderCurrencyStack(container, groups, emptyText) {

    if (!container) {
        return;
    }

    container.replaceChildren();

    if (!groups.length) {

        container.textContent = emptyText || "—";

        return;
    }

    groups.forEach(function (group) {

        const line = document.createElement("span");

        line.className = "amount-line";

        const code = document.createElement("span");

        code.className = "amount-code";
        code.textContent =
            getCurrencyDisplayCode(group.currency);

        const value = document.createElement("strong");

        value.textContent =
            formatCurrency(
                group.total,
                group.currency
            );

        line.append(code, value);

        container.appendChild(line);
    });
}


function renderSummaryCards() {

    const groups =
        groupByCurrency(filteredReceipts);

    const currencyCount =
        document.getElementById("currencyCount");

    const currencyCountNote =
        document.getElementById("currencyCountNote");

    const monthlyContainer =
        document.getElementById("monthlyCurrencyTotals");

    const receiptCount =
        document.getElementById("receiptCount");

    const receiptCountNote =
        document.getElementById("receiptCountNote");

    const topCategoryValue =
        document.getElementById("topCategoryValue");

    const topCategoryNote =
        document.getElementById("topCategoryNote");


    if (currencyCount) {
        currencyCount.textContent = groups.length;
    }

    if (currencyCountNote) {

        currencyCountNote.textContent =
            groups.length ?
                "Separate totals, no conversion" :
                "No matching currencies";
    }


    const currentMonth = new Date();

    const monthlyGroups =
        groupByCurrency(
            filteredReceipts.filter(function (receipt) {
                return isInMonth(receipt, currentMonth);
            })
        );

    renderCurrencyStack(
        monthlyContainer,
        monthlyGroups,
        "—"
    );


    if (receiptCount) {
        receiptCount.textContent =
            filteredReceipts.length;
    }

    if (receiptCountNote) {

        const hasFilters =
            readFilters().currency !== "ALL" ||
            readFilters().category !== "ALL" ||
            readFilters().from ||
            readFilters().to;

        receiptCountNote.textContent =
            hasFilters ?
                "Matching receipts" :
                "Total receipts";
    }


    if (!topCategoryValue || !topCategoryNote) {
        return;
    }

    if (!groups.length) {

        topCategoryValue.textContent = "-";
        topCategoryNote.textContent =
            "No category data";

        return;
    }

    if (groups.length > 1) {

        topCategoryValue.textContent =
            "By currency";

        topCategoryNote.textContent =
            "Select a currency to rank categories";

        return;
    }

    const group = groups[0];

    const categories =
        getCategoryTotals(group.receipts);

    const topCategory = categories[0];

    if (!topCategory) {

        topCategoryValue.textContent = "-";
        topCategoryNote.textContent =
            "No category data";

        return;
    }

    topCategoryValue.textContent =
        topCategory.category;

    topCategoryNote.textContent =
        formatCurrency(
            topCategory.total,
            group.currency
        ) +
        " · " +
        getCurrencyLabel(group.currency);
}


// ==========================================
// RENDER CURRENCY-WISE SPENDING
// ==========================================

function renderCurrencySummary() {

    const container =
        document.getElementById("currencySummaryList");

    if (!container) {
        return;
    }

    const groups =
        groupByCurrency(filteredReceipts);

    if (!groups.length) {

        renderEmpty(
            container,
            receipts.length ?
                "No expenses match the selected filters." :
                "No expenses saved yet. Scan a receipt to start tracking spending."
        );

        return;
    }

    container.replaceChildren();

    groups.forEach(function (group) {

        const row = document.createElement("div");

        row.className = "currency-summary-row";

        const main = document.createElement("div");

        main.className = "currency-summary-main";

        const badge = document.createElement("span");

        badge.className =
            "currency-badge" +
            (
                group.currency === OTHER_CURRENCY ?
                    " currency-badge-other" :
                    ""
            );

        badge.textContent =
            getCurrencyDisplayCode(group.currency);

        const details = document.createElement("div");

        details.className = "currency-summary-details";

        const label = document.createElement("strong");

        label.textContent =
            group.currency === OTHER_CURRENCY ?
                "Currency not set" :
                getCurrencyLabel(group.currency);

        const count = document.createElement("small");

        count.textContent =
            pluralize(group.count, "receipt");

        details.append(label, count);

        main.append(badge, details);

        const amount = document.createElement("div");

        amount.className = "currency-summary-amount";

        const total = document.createElement("strong");

        total.textContent =
            formatCurrency(
                group.total,
                group.currency
            );

        const separate = document.createElement("small");

        separate.textContent =
            "Original currency total";

        amount.append(total, separate);

        row.append(main, amount);

        container.appendChild(row);
    });
}


// ==========================================
// RENDER CATEGORY BREAKDOWN
// ==========================================

function renderCategoryBreakdown(groups) {

    const container =
        document.getElementById("categoryList");

    const note =
        document.getElementById("categorySummaryNote");

    if (!container) {
        return;
    }

    if (!groups.length) {

        renderEmpty(
            container,
            receipts.length ?
                "No category data matches the selected filters." :
                "No category data available yet."
        );

        if (note) {
            note.textContent =
                "Category totals follow the selected currency filter.";
        }

        return;
    }

    const items = [];

    groups.forEach(function (group) {

        getCategoryTotals(group.receipts).forEach(
            function (categoryTotal) {

                items.push({
                    ...categoryTotal,
                    currency: group.currency
                });

            }
        );
    });

    items.sort(function (a, b) {

        const currencyOrder =
            compareCurrencies(a.currency, b.currency);

        if (currencyOrder !== 0) {
            return currencyOrder;
        }

        return b.total - a.total;
    });

    container.replaceChildren();

    items.forEach(function (item) {

        const row = document.createElement("div");

        row.className = "category-item";

        const name = document.createElement("span");

        const categoryLabel =
            document.createTextNode(item.category);

        const currencyChip =
            document.createElement("em");

        currencyChip.className = "currency-chip";
        currencyChip.textContent =
            getCurrencyDisplayCode(item.currency);

        name.append(categoryLabel, currencyChip);

        const amount = document.createElement("strong");

        amount.textContent =
            formatCurrency(
                item.total,
                item.currency
            );

        row.append(name, amount);

        container.appendChild(row);
    });

    if (!note) {
        return;
    }

    if (groups.length > 1) {

        note.textContent =
            "Showing each category per currency. Select one currency for a single-currency breakdown.";
    }
    else {

        note.textContent =
            "All category totals are shown in " +
            getCurrencyLabel(groups[0].currency) +
            ".";
    }
}


// ==========================================
// RENDER EXPENSE HISTORY
// ==========================================

function renderExpenseHistory() {

    const tableBody =
        document.getElementById("expenseTableBody");

    if (!tableBody) {
        return;
    }

    const sortedReceipts =
        sortExpenseRecords(filteredReceipts);

    tableBody.replaceChildren();

    if (!sortedReceipts.length) {

        const row = document.createElement("tr");

        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.textContent =
            receipts.length ?
                "No expenses match the selected filters." :
                "No expenses available yet";

        row.appendChild(cell);
        tableBody.appendChild(row);

        return;
    }

    sortedReceipts.forEach(function (receipt) {

        const row = document.createElement("tr");

        const dateCell = document.createElement("td");

        dateCell.textContent =
            formatExpenseDate(receipt);

        const storeCell = document.createElement("td");

        storeCell.textContent =
            receipt.storeName || "-";

        const categoryCell = document.createElement("td");

        categoryCell.textContent =
            receipt.category || "Other";

        const currencyCell = document.createElement("td");

        const currencyBadge =
            document.createElement("span");

        currencyBadge.className =
            "table-currency-badge" +
            (
                receipt.currency === OTHER_CURRENCY ?
                    " currency-badge-other" :
                    ""
            );

        currencyBadge.textContent =
            getCurrencyDisplayCode(receipt.currency);

        currencyCell.appendChild(currencyBadge);

        const amountCell = document.createElement("td");

        amountCell.className = "expense-amount";
        amountCell.textContent =
            formatCurrency(
                receipt.totalAmount,
                receipt.currency
            );

        row.append(
            dateCell,
            storeCell,
            categoryCell,
            currencyCell,
            amountCell
        );

        tableBody.appendChild(row);
    });
}


// ==========================================
// MONTHLY EXPENSE CHART
// ==========================================

function createMonthlyExpenseChart(filteredRecords, groups) {

    const ctx =
        document.getElementById("monthlyExpenseChart");

    const wrap =
        document.getElementById("monthlyChartWrap");

    const note =
        document.getElementById("monthlyChartNote");

    if (!ctx || !wrap || !note) {
        return;
    }

    if (monthlyChart) {

        monthlyChart.destroy();
        monthlyChart = null;
    }

    const chartCurrency =
        getChartCurrency(groups);

    if (!chartCurrency) {

        wrap.style.display = "none";

        note.hidden = false;
        note.textContent =
            groups.length > 1 ?
                "Select a currency to view the monthly chart. Amounts in different currencies are not combined." :
                "No dated expenses match the selected filters.";

        return;
    }

    if (typeof Chart === "undefined") {

        wrap.style.display = "none";

        note.hidden = false;
        note.textContent =
            "The chart library could not load. The totals above are still available.";

        return;
    }

    const monthlyData = new Map();

    filteredRecords.forEach(function (record) {

        if (!record.dateObj) {
            return;
        }

        const key =
            record.dateObj.getFullYear() +
            "-" +
            String(record.dateObj.getMonth() + 1)
                .padStart(2, "0");

        if (!monthlyData.has(key)) {
            monthlyData.set(key, 0);
        }

        monthlyData.set(
            key,
            monthlyData.get(key) +
            record.totalAmount
        );
    });

    if (!monthlyData.size) {

        wrap.style.display = "none";

        note.hidden = false;
        note.textContent =
            "No dated expenses match the selected filters.";

        return;
    }

    const entries =
        Array.from(monthlyData.entries())
            .sort(function (a, b) {
                return a[0].localeCompare(b[0]);
            });

    const labels = entries.map(function (entry) {

        const parts = entry[0].split("-");

        return new Date(
            Number(parts[0]),
            Number(parts[1]) - 1,
            1
        ).toLocaleDateString("en-IN", {
            month: "short",
            year: "numeric"
        });
    });

    wrap.style.display = "flex";

    note.hidden = true;

    ctx.style.display = "block";

    monthlyChart = new Chart(ctx, {

        type: "bar",

        data: {
            labels,
            datasets: [{
                label: "Monthly spending",
                data: entries.map(function (entry) {
                    return entry[1];
                }),
                backgroundColor: "#2563eb",
                borderRadius: 8,
                maxBarThickness: 42
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: false
                },

                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return (
                                "Spent: " +
                                formatCurrency(
                                    context.parsed.y,
                                    chartCurrency
                                )
                            );
                        }
                    }
                }
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },

                y: {
                    beginAtZero: true,

                    ticks: {
                        callback: function (value) {
                            return formatChartTick(
                                value,
                                chartCurrency
                            );
                        }
                    }
                }
            }
        }
    });
}


// ==========================================
// CATEGORY EXPENSE CHART
// ==========================================

function createCategoryExpenseChart(filteredRecords, groups) {

    const ctx =
        document.getElementById("categoryExpenseChart");

    const wrap =
        document.getElementById("categoryChartWrap");

    const note =
        document.getElementById("categoryChartNote");

    if (!ctx || !wrap || !note) {
        return;
    }

    if (categoryChart) {

        categoryChart.destroy();
        categoryChart = null;
    }

    const chartCurrency =
        getChartCurrency(groups);

    if (!chartCurrency) {

        wrap.style.display = "none";

        note.hidden = false;
        note.textContent =
            groups.length > 1 ?
                "Select a currency to view the category chart. Amounts in different currencies are not combined." :
                "No category data matches the selected filters.";

        return;
    }

    if (typeof Chart === "undefined") {

        wrap.style.display = "none";

        note.hidden = false;
        note.textContent =
            "The chart library could not load. The category totals above are still available.";

        return;
    }

    const categories =
        getCategoryTotals(filteredRecords);

    if (!categories.length) {

        wrap.style.display = "none";

        note.hidden = false;
        note.textContent =
            "No category data matches the selected filters.";

        return;
    }

    wrap.style.display = "flex";

    note.hidden = true;

    ctx.style.display = "block";

    categoryChart = new Chart(ctx, {

        type: "doughnut",

        data: {
            labels: categories.map(function (item) {
                return item.category;
            }),

            datasets: [{
                label: "Category spending",
                data: categories.map(function (item) {
                    return item.total;
                }),
                backgroundColor:
                    categories.map(function (item, index) {
                        return CHART_COLORS[
                            index % CHART_COLORS.length
                        ];
                    }),
                borderColor: "#ffffff",
                borderWidth: 2,
                hoverOffset: 4
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    position: "bottom",

                    labels: {
                        boxWidth: 10,
                        boxHeight: 10,
                        usePointStyle: true,
                        padding: 14
                    }
                },

                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return (
                                context.label +
                                ": " +
                                formatCurrency(
                                    context.parsed,
                                    chartCurrency
                                )
                            );
                        }
                    }
                }
            }
        }
    });
}


// ==========================================
// UPDATE THE WHOLE PAGE
// ==========================================

function updateExpensePage() {

    const groups =
        groupByCurrency(filteredReceipts);

    renderSummaryCards();
    renderCurrencySummary();
    renderCategoryBreakdown(groups);
    renderExpenseHistory();
    createMonthlyExpenseChart(filteredReceipts, groups);
    createCategoryExpenseChart(filteredReceipts, groups);
}


function applyFilters() {

    filteredReceipts =
        filterExpenseRecords(
            receipts,
            readFilters()
        );

    updateExpensePage();
}


// ==========================================
// FILTER CONTROLS
// ==========================================

function populateFilters() {

    const currencySelect =
        document.getElementById("expenseCurrencyFilter");

    const categorySelect =
        document.getElementById("expenseCategoryFilter");

    if (!currencySelect || !categorySelect) {
        return;
    }

    const previousCurrency =
        currencySelect.value || "ALL";

    const previousCategory =
        categorySelect.value || "ALL";

    const currencies =
        Array.from(
            new Set(
                receipts.map(function (receipt) {
                    return receipt.currency;
                })
            )
        ).sort(compareCurrencies);

    const categories =
        Array.from(
            new Set(
                receipts.map(function (receipt) {
                    return receipt.category;
                })
            )
        ).sort(function (a, b) {
            return a.localeCompare(b);
        });


    currencySelect.replaceChildren();

    const allCurrencies =
        document.createElement("option");

    allCurrencies.value = "ALL";
    allCurrencies.textContent = "All currencies";

    currencySelect.appendChild(allCurrencies);

    currencies.forEach(function (currency) {

        const option =
            document.createElement("option");

        option.value = currency;
        option.textContent = getCurrencyLabel(currency);

        currencySelect.appendChild(option);
    });

    currencySelect.value =
        currencies.includes(previousCurrency) ?
            previousCurrency :
            "ALL";


    categorySelect.replaceChildren();

    const allCategories =
        document.createElement("option");

    allCategories.value = "ALL";
    allCategories.textContent = "All categories";

    categorySelect.appendChild(allCategories);

    categories.forEach(function (category) {

        const option =
            document.createElement("option");

        option.value = category;
        option.textContent = category;

        categorySelect.appendChild(option);
    });

    categorySelect.value =
        categories.includes(previousCategory) ?
            previousCategory :
            "ALL";
}


function setupFilterControls() {

    const selects = getFilterSelects();

    [
        selects.currency,
        selects.category,
        selects.from,
        selects.to
    ].forEach(function (control) {

        if (!control) {
            return;
        }

        control.addEventListener(
            "change",
            applyFilters
        );
    });

    const resetButton =
        document.getElementById("resetExpenseFilters");

    if (!resetButton) {
        return;
    }

    resetButton.addEventListener("click", function () {

        if (selects.currency) {
            selects.currency.value = "ALL";
        }

        if (selects.category) {
            selects.category.value = "ALL";
        }

        if (selects.from) {
            selects.from.value = "";
        }

        if (selects.to) {
            selects.to.value = "";
        }

        applyFilters();
    });
}


// ==========================================
// LOAD RECEIPTS FROM FIRESTORE
// ==========================================

async function loadReceipts(user) {

    try {

        if (!user) {

            receipts = [];

            populateFilters();
            applyFilters();

            return;
        }

        const receiptsRef =
            collection(
                db,
                "users",
                user.uid,
                "receipts"
            );

        const snapshot =
            await getDocs(receiptsRef);

        receipts =
            snapshot.docs.map(function (doc) {
                return normalizeReceipt(
                    doc.data(),
                    doc.id
                );
            });

        populateFilters();
        applyFilters();
    }
    catch (error) {

        console.error(
            "Expense data loading error:",
            error
        );

        receipts = [];
        filteredReceipts = [];

        populateFilters();
        applyFilters();

        alert(
            "Unable to load expense data. Please try again."
        );
    }
}


// ==========================================
// START
// ==========================================

setupFilterControls();

onAuthStateChanged(auth, function (user) {
    loadReceipts(user);
});
