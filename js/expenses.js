// ==========================================
// SHOPIX - Expense Tracking & Analytics
// Real Firestore Receipt Data
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
// ==========================================
// RECEIPTS
// ==========================================

let receipts = [];

let monthlyChart = null;
let categoryChart = null;


// ==========================================
// CALCULATE TOTAL SPENDING
// ==========================================

function calculateTotalSpending() {

    return receipts.reduce((total, receipt) => {

        return total + Number(receipt.totalAmount || 0);

    }, 0);
}


// ==========================================
// CURRENT MONTH SPENDING
// ==========================================

function calculateMonthlySpending() {

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    return receipts
        .filter(receipt => {

            const date = new Date(receipt.purchaseDate);

            return (
                !isNaN(date.getTime()) &&
                date.getMonth() === currentMonth &&
                date.getFullYear() === currentYear
            );

        })
        .reduce((total, receipt) => {

            return total + Number(receipt.totalAmount || 0);

        }, 0);
}


// ==========================================
// CATEGORY-WISE SPENDING
// ==========================================

function calculateCategorySpending() {

    const categories = {};

    receipts.forEach(receipt => {

        const category =
            receipt.category || "Other";

        const amount =
            Number(receipt.totalAmount || 0);

        if (!categories[category]) {
            categories[category] = 0;
        }

        categories[category] += amount;

    });

    return categories;
}


// ==========================================
// TOP CATEGORY
// ==========================================

function getTopCategory(categorySpending) {

    let topCategory = "-";
    let highestAmount = 0;

    for (const category in categorySpending) {

        if (categorySpending[category] > highestAmount) {

            highestAmount =
                categorySpending[category];

            topCategory =
                category;
        }

    }

    return topCategory;
}


// ==========================================
// UPDATE EXPENSE PAGE
// ==========================================

function updateExpensePage() {

    const totalSpending =
        calculateTotalSpending();

    const monthlySpending =
        calculateMonthlySpending();

    const categorySpending =
        calculateCategorySpending();

    const topCategory =
        getTopCategory(categorySpending);


    // ======================================
    // SUMMARY CARDS
    // ======================================

    const amounts =
        document.querySelectorAll(
            ".summary-cards .amount"
        );

    if (amounts.length >= 4) {

        amounts[0].textContent =
            `₹${totalSpending.toLocaleString("en-IN")}`;

        amounts[1].textContent =
            `₹${monthlySpending.toLocaleString("en-IN")}`;

        amounts[2].textContent =
            receipts.length;

        amounts[3].textContent =
            topCategory;
    }


    // ======================================
    // CATEGORY-WISE SPENDING
    // ======================================

    const categoryItems =
        document.querySelectorAll(
            ".category-item"
        );

    categoryItems.forEach(item => {

        const categoryName =
            item.querySelector("span").textContent
                .replace("🛒", "")
                .replace("👕", "")
                .replace("💻", "")
                .replace("🏠", "")
                .trim();

        const amountElement =
            item.querySelector("strong");

        if (amountElement) {

            amountElement.textContent =
                `₹${(
                    categorySpending[categoryName] || 0
                ).toLocaleString("en-IN")}`;
        }

    });


    // ======================================
    // EXPENSE HISTORY
    // ======================================

    const tableBody =
        document.querySelector("tbody");

    if (tableBody) {

        tableBody.innerHTML = "";

        if (receipts.length === 0) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="4">
                        No expenses available yet
                    </td>
                </tr>
            `;

        } else {

            receipts.forEach(receipt => {

                const row =
                    document.createElement("tr");

                row.innerHTML = `
                    <td>
                        ${receipt.purchaseDate || "-"}
                    </td>

                    <td>
                        ${receipt.storeName || "-"}
                    </td>

                    <td>
                        ${receipt.category || "Other"}
                    </td>

                    <td>
                        ₹${Number(
                            receipt.totalAmount || 0
                        ).toLocaleString("en-IN")}
                    </td>
                `;

                tableBody.appendChild(row);

            });

        }

    }

}


// ==========================================
// MONTHLY EXPENSE CHART
// ==========================================

function createMonthlyExpenseChart() {

    const ctx =
        document.getElementById(
            "monthlyExpenseChart"
        );

    if (!ctx) {
        return;
    }


    // Destroy old chart if it exists

    if (monthlyChart) {

        monthlyChart.destroy();

        monthlyChart = null;
    }


    // No receipt data

    if (receipts.length === 0) {

        ctx.style.display = "none";

        return;
    }


    ctx.style.display = "block";


    const monthlyData = {};


    receipts.forEach(receipt => {

        const date =
            new Date(receipt.purchaseDate);

        if (isNaN(date.getTime())) {
            return;
        }


        const month =
            date.toLocaleString("en-US", {
                month: "short"
            });


        if (!monthlyData[month]) {
            monthlyData[month] = 0;
        }


        monthlyData[month] +=
            Number(receipt.totalAmount || 0);

    });


    monthlyChart =
        new Chart(ctx, {

            type: "bar",

            data: {

                labels:
                    Object.keys(monthlyData),

                datasets: [{

                    label:
                        "Monthly Spending",

                    data:
                        Object.values(monthlyData)

                }]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                scales: {

                    y: {

                        beginAtZero: true

                    }

                }

            }

        });

}


// ==========================================
// CATEGORY EXPENSE CHART
// ==========================================

function createCategoryExpenseChart() {

    const ctx =
        document.getElementById(
            "categoryExpenseChart"
        );

    if (!ctx) {
        return;
    }


    // Destroy old chart if it exists

    if (categoryChart) {

        categoryChart.destroy();

        categoryChart = null;
    }


    const categorySpending =
        calculateCategorySpending();


    // No receipt data

  if (receipts.length === 0) {

    ctx.parentElement.style.display = "none";

    return;
}  


    ctx.parentElement.style.display = "flex";
ctx.style.display = "block";

    categoryChart =
        new Chart(ctx, {

            type: "doughnut",

            data: {

                labels:
                    Object.keys(categorySpending),

                datasets: [{

                    label:
                        "Category Spending",

                    data:
                        Object.values(categorySpending)

                }]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {

                        position: "bottom"

                    }

                }

            }

        });

}


// ==========================================
// LOAD RECEIPTS FROM FIRESTORE
// ==========================================

async function loadReceipts(user) {

    try {

        if (!user) {

            console.log(
                "No logged-in user found."
            );

            receipts = [];

            updateExpensePage();

            createMonthlyExpenseChart();

            createCategoryExpenseChart();

            return;
        }


        console.log(
            "Loading receipts for user:",
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


        receipts = [];


        snapshot.forEach(doc => {

            receipts.push({

                id: doc.id,

                ...doc.data()

            });

        });


        console.log(
            "SHOPIX Firestore Receipts:",
            receipts
        );


        updateExpensePage();

        createMonthlyExpenseChart();

        createCategoryExpenseChart();

    }

    catch (error) {

        console.error(
            "Expense data loading error:",
            error
        );

        alert(
            "Unable to load expense data."
        );

    }

}


// ==========================================
// START
// ==========================================

onAuthStateChanged(auth, (user) => {

    if (user) {

        console.log(
            "Logged-in user:",
            user.uid
        );

        loadReceipts(user);

    } else {

        console.log(
            "User is not logged in."
        );

        loadReceipts(null);

    }

});