// ==========================================
// SHOPIX - EXPENSE ANALYTICS
// ==========================================

import { auth, db } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";


// ==========================================
// HTML ELEMENTS
// ==========================================

const totalSpending =
    document.getElementById("totalSpending");

const totalReceipts =
    document.getElementById("totalReceipts");

const topCategory =
    document.getElementById("topCategory");

const categoryList =
    document.getElementById("categoryList");

const spendingChart =
    document.getElementById("spendingChart");

const recentExpenses =
    document.getElementById("recentExpenses");


// ==========================================
// LOAD EXPENSE DATA
// ==========================================

async function loadExpenseAnalytics(user) {

    try {

        console.log(
            "Loading expense data for:",
            user.uid
        );


        // Firestore receipts collection
        const receiptsRef =
            collection(
                db,
                "users",
                user.uid,
                "receipts"
            );


        const snapshot =
            await getDocs(receiptsRef);


        // ==========================================
        // NO RECEIPTS
        // ==========================================

        if (snapshot.empty) {

            totalSpending.textContent = "₹0";
            totalReceipts.textContent = "0";
            topCategory.textContent = "—";

            showEmptyCategoryState();
            showEmptyChartState();
            showEmptyRecentState();

            return;
        }


        // ==========================================
        // VARIABLES
        // ==========================================

        let totalAmount = 0;

        const categoryTotals = {};

        const receipts = [];


        // ==========================================
        // READ RECEIPTS
        // ==========================================

        snapshot.forEach((docSnapshot) => {

            const receipt =
                docSnapshot.data();


            // Convert amount safely
            const amount =
                Number(
                    String(
                        receipt.totalAmount || 0
                    ).replace(/[^\d.-]/g, "")
                ) || 0;


            totalAmount += amount;


            // Category
            const category =
                receipt.category || "Other";


            if (!categoryTotals[category]) {

                categoryTotals[category] = 0;

            }


            categoryTotals[category] += amount;


            // Store receipt information
            receipts.push({

                id: docSnapshot.id,

                storeName:
                    receipt.storeName ||
                    "Unknown Store",

                purchaseDate:
                    receipt.purchaseDate ||
                    "No date",

                totalAmount:
                    amount,

                category:
                    category

            });

        });


        // ==========================================
        // SUMMARY
        // ==========================================

        totalSpending.textContent =
            formatCurrency(totalAmount);


        totalReceipts.textContent =
            receipts.length;


        // ==========================================
        // TOP CATEGORY
        // ==========================================

        let highestCategory = "—";
        let highestAmount = 0;


        Object.entries(categoryTotals).forEach(
            ([category, amount]) => {

                if (amount > highestAmount) {

                    highestAmount = amount;
                    highestCategory = category;

                }

            }
        );


        topCategory.textContent =
            highestCategory;


        // ==========================================
        // CATEGORY ANALYTICS
        // ==========================================

        displayCategories(
            categoryTotals,
            totalAmount
        );


        // ==========================================
        // SPENDING DISTRIBUTION CHART
        // ==========================================

        displaySpendingChart(
            categoryTotals,
            totalAmount
        );


        // ==========================================
        // SORT RECENT EXPENSES
        // ==========================================

        receipts.sort((a, b) => {

            const dateA =
                parseReceiptDate(
                    a.purchaseDate
                );

            const dateB =
                parseReceiptDate(
                    b.purchaseDate
                );

            return dateB - dateA;

        });


        // ==========================================
        // RECENT EXPENSES
        // ==========================================

        displayRecentExpenses(
            receipts.slice(0, 5)
        );


        console.log(
            "✅ Expense analytics loaded successfully."
        );


    } catch (error) {

        console.error(
            "❌ Error loading expense analytics:",
            error
        );


        totalSpending.textContent = "₹0";
        totalReceipts.textContent = "0";
        topCategory.textContent = "—";


        categoryList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">!</div>
                <h3>Unable to load expense data</h3>
                <p>Please try again later.</p>
            </div>
        `;


        if (spendingChart) {

            spendingChart.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">!</div>
                    <h3>Unable to load chart</h3>
                    <p>Please try again later.</p>
                </div>
            `;

        }


        recentExpenses.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">!</div>
                <h3>Unable to load expenses</h3>
                <p>Please try again later.</p>
            </div>
        `;

    }

}


// ==========================================
// DISPLAY CATEGORY DATA
// ==========================================

function displayCategories(
    categoryTotals,
    totalAmount
) {

    categoryList.innerHTML = "";


    const categories =
        Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1]);


    categories.forEach(
        ([category, amount]) => {

            const percentage =
                totalAmount > 0
                    ? (amount / totalAmount) * 100
                    : 0;


            const row =
                document.createElement("div");

            row.className =
                "category-row";


            const icon =
                document.createElement("div");

            icon.className =
                "category-icon";

            icon.textContent =
                getCategoryIcon(category);


            const info =
                document.createElement("div");

            info.className =
                "category-info";


            const name =
                document.createElement("span");

            name.className =
                "category-name";

            name.textContent =
                category;


            const bar =
                document.createElement("div");

            bar.className =
                "category-bar";


            const progress =
                document.createElement("div");

            progress.className =
                "category-progress";

            progress.style.width =
                percentage + "%";


            bar.appendChild(progress);

            info.appendChild(name);
            info.appendChild(bar);


            const amountElement =
                document.createElement("div");

            amountElement.className =
                "category-amount";

            amountElement.textContent =
                formatCurrency(amount);


            row.appendChild(icon);
            row.appendChild(info);
            row.appendChild(amountElement);


            categoryList.appendChild(row);

        }
    );

}


// ==========================================
// SPENDING DISTRIBUTION CHART
// ==========================================

function displaySpendingChart(
    categoryTotals,
    totalAmount
) {

    if (!spendingChart) {
        return;
    }


    spendingChart.innerHTML = "";


    const categories =
        Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1]);


    if (categories.length === 0) {

        showEmptyChartState();

        return;
    }


    categories.forEach(
        ([category, amount]) => {

            const percentage =
                totalAmount > 0
                    ? (amount / totalAmount) * 100
                    : 0;


            // Chart row
            const row =
                document.createElement("div");

            row.className =
                "chart-row";


            // Category name
            const label =
                document.createElement("div");

            label.className =
                "chart-label";

            label.textContent =
                category;


            // Bar
            const bar =
                document.createElement("div");

            bar.className =
                "chart-bar";


            const fill =
                document.createElement("div");

            fill.className =
                "chart-fill";


            fill.style.width =
                percentage + "%";


            // Percentage
            const percentageText =
                document.createElement("div");

            percentageText.className =
                "chart-percentage";

            percentageText.textContent =
                percentage.toFixed(1) + "%";


            bar.appendChild(fill);


            row.appendChild(label);
            row.appendChild(bar);
            row.appendChild(
                percentageText
            );


            spendingChart.appendChild(row);

        }
    );

}


// ==========================================
// DISPLAY RECENT EXPENSES
// ==========================================

function displayRecentExpenses(receipts) {

    recentExpenses.innerHTML = "";


    if (receipts.length === 0) {

        showEmptyRecentState();

        return;

    }


    receipts.forEach((receipt) => {

        const row =
            document.createElement("div");

        row.className =
            "expense-row";


        const icon =
            document.createElement("div");

        icon.className =
            "expense-icon";

        icon.textContent =
            getCategoryIcon(
                receipt.category
            );


        const info =
            document.createElement("div");

        info.className =
            "expense-info";


        const store =
            document.createElement("span");

        store.className =
            "expense-store";

        store.textContent =
            receipt.storeName;


        const meta =
            document.createElement("span");

        meta.className =
            "expense-meta";

        meta.textContent =
            `${receipt.category} · ${receipt.purchaseDate}`;


        info.appendChild(store);
        info.appendChild(meta);


        const amount =
            document.createElement("div");

        amount.className =
            "expense-amount";

        amount.textContent =
            formatCurrency(
                receipt.totalAmount
            );


        row.appendChild(icon);
        row.appendChild(info);
        row.appendChild(amount);


        // Open receipt details
        row.addEventListener(
            "click",
            function () {

                localStorage.setItem(
                    "selectedReceiptId",
                    receipt.id
                );

                window.location.href =
                    "receiptDetails.html";

            }
        );


        recentExpenses.appendChild(row);

    });

}


// ==========================================
// EMPTY STATES
// ==========================================

function showEmptyCategoryState() {

    categoryList.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">📊</div>
            <h3>No expense data yet</h3>
            <p>
                Save some receipts to see your
                spending analysis.
            </p>
        </div>
    `;

}


function showEmptyChartState() {

    if (!spendingChart) {
        return;
    }


    spendingChart.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">📊</div>
            <h3>No spending data yet</h3>
            <p>
                Save some receipts to see the
                spending distribution.
            </p>
        </div>
    `;

}


function showEmptyRecentState() {

    recentExpenses.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">🧾</div>
            <h3>No expenses yet</h3>
            <p>
                Your saved receipts will appear here.
            </p>
        </div>
    `;

}


// ==========================================
// CATEGORY ICON
// ==========================================

function getCategoryIcon(category) {

    const icons = {

        "Electronics": "💻",

        "Grocery": "🛒",

        "Clothing": "👕",

        "Travel": "✈️",

        "Food": "🍴",

        "Other": "📦"

    };


    return icons[category] || "📦";

}


// ==========================================
// CURRENCY FORMAT
// ==========================================

function formatCurrency(amount) {

    return "₹" +
        Number(amount || 0)
            .toLocaleString("en-IN");

}


// ==========================================
// DATE PARSER
// ==========================================

function parseReceiptDate(dateValue) {

    if (!dateValue) {
        return 0;
    }


    const date =
        new Date(dateValue);


    if (!isNaN(date.getTime())) {
        return date.getTime();
    }


    return 0;

}


// ==========================================
// AUTH STATE
// ==========================================

onAuthStateChanged(
    auth,
    function (user) {

        if (user) {

            console.log(
                "✅ Analytics user:",
                user.uid
            );

            loadExpenseAnalytics(user);

        } else {

            console.log(
                "ℹ️ No user logged in."
            );


            totalSpending.textContent =
                "₹0";

            totalReceipts.textContent =
                "0";

            topCategory.textContent =
                "—";

            showEmptyCategoryState();
            showEmptyChartState();
            showEmptyRecentState();

        }

    }
);