import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


const insightText =
    document.querySelector(".ai-card p") ||
    document.getElementById("mainInsight");
const totalSpendingElement =
    document.getElementById("totalSpending");

const totalReceiptsElement =
    document.getElementById("totalReceipts");

const averageSpendingElement =
    document.getElementById("averageSpending");
let currentUser = null;


/* =========================
   LOAD SMART INSIGHTS
========================= */

async function loadSmartInsight() {

    if (snapshot.empty) {

    insightText.textContent =
        "Add some receipts to start receiving smart shopping insights.";

    if (totalSpendingElement) {
        totalSpendingElement.textContent = "₹0.00";
    }

    if (totalReceiptsElement) {
        totalReceiptsElement.textContent = "0";
    }

    if (topCategoryElement) {
        topCategoryElement.textContent = "-";
    }

    return;
}


    try {

        const receiptsRef = collection(
            db,
            "users",
            currentUser.uid,
            "receipts"
        );

        const snapshot = await getDocs(receiptsRef);


        if (snapshot.empty) {

    insightText.textContent =
        "Add some receipts to start receiving smart shopping insights.";

    if (totalSpendingElement) {
        totalSpendingElement.textContent = "₹0.00";
    }

    if (totalReceiptsElement) {
        totalReceiptsElement.textContent = "0";
    }

    if (topCategoryElement) {
        topCategoryElement.textContent = "-";
    }

    if (averageSpendingElement) {
        averageSpendingElement.textContent = "₹0.00";
    }

    return;
}


        let totalSpent = 0;

        const categoryTotals = {};

        let receiptCount = 0;


        /* =========================
           PROCESS RECEIPTS
        ========================== */

        snapshot.forEach((doc) => {

            const receipt = doc.data();

            receiptCount++;


            const amount =
                Number(receipt.totalAmount) || 0;

            totalSpent += amount;


            const category =
                receipt.category || "Other";


            if (!categoryTotals[category]) {

                categoryTotals[category] = 0;

            }


            categoryTotals[category] += amount;

        });


        /* =========================
           FIND TOP CATEGORY
        ========================== */

        const sortedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1]);


const topCategory =
    sortedCategories.length > 0
        ? sortedCategories[0][0]
        : "Other";


const topAmount =
    sortedCategories.length > 0
        ? sortedCategories[0][1]
        : 0;


const secondCategory =
    sortedCategories.length > 1
        ? sortedCategories[1][0]
        : null;


const secondAmount =
    sortedCategories.length > 1
        ? sortedCategories[1][1]
        : 0;        


        /* =========================
           CALCULATE PERCENTAGE
        ========================== */

        const percentage =
            totalSpent > 0
                ? Math.round(
                    (topAmount / totalSpent) * 100
                )
                : 0;
                const averageSpending =
    receiptCount > 0
        ? totalSpent / receiptCount
        : 0;

if (averageSpendingElement) {
    averageSpendingElement.textContent =
        `₹${averageSpending.toFixed(2)}`;
}
                if (totalSpendingElement) {
    totalSpendingElement.textContent =
        `₹${totalSpent.toFixed(2)}`;
}

if (totalReceiptsElement) {
    totalReceiptsElement.textContent =
        receiptCount;
}

if (topCategoryElement) {
    topCategoryElement.textContent =
        topCategory;
}

        /* =========================
           DISPLAY INSIGHT
        ========================== */

        let insightMessage =
    `You have ${receiptCount} recorded receipt` +
    `${receiptCount !== 1 ? "s" : ""} ` +
    `with total spending of ₹${totalSpent.toFixed(2)}. ` +
    `${topCategory} is your highest spending category ` +
    `at ${percentage}% of your recorded spending.`;


if (secondCategory) {

    const secondPercentage =
        totalSpent > 0
            ? Math.round(
                (secondAmount / totalSpent) * 100
            )
            : 0;

    insightMessage +=
        ` ${secondCategory} is your second-highest category ` +
        `at ${secondPercentage}%.`;
}


insightText.textContent = insightMessage;

    } catch (error) {

        console.error(
            "Error loading smart insights:",
            error
        );

        insightText.textContent =
            "Unable to load smart insights right now.";

    }

}


/* =========================
   AUTH STATE
========================= */

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        currentUser = null;

        console.log(
            "No user is currently logged in."
        );

        await loadSmartInsight();

        return;
    }


    currentUser = user;

    console.log(
        "Logged-in User UID:",
        user.uid
    );


    await loadSmartInsight();

});