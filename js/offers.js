import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


const offersList = document.querySelector(".offers-list");

let currentUser = null;


/* =========================
   DEMO OFFERS
========================= */

const offers = [
    {
        category: "Electronics",
        title: "Electronics Deals",
        description: "Special offers on electronics and gadgets",
        badge: "Up to 20% Off",
        icon: "🛍️"
    },
    {
        category: "Fashion",
        title: "Fashion Offers",
        description: "Save on clothing, footwear and accessories",
        badge: "Up to 30% Off",
        icon: "👟"
    },
    {
        category: "Home",
        title: "Home & Living",
        description: "Deals on home and everyday essentials",
        badge: "Special Deal",
        icon: "🏠"
    }
];


/* =========================
   GET RECEIPT CATEGORIES
========================= */

async function getReceiptCategories() {

    if (!currentUser) {
        return [];
    }

    try {

        const receiptsRef = collection(
            db,
            "users",
            currentUser.uid,
            "receipts"
        );

        const snapshot = await getDocs(receiptsRef);

        const categories = [];

        snapshot.forEach((doc) => {

            const receipt = doc.data();

            if (receipt.category) {
                categories.push(
                    receipt.category.toLowerCase()
                );
            }

        });

        return categories;

    } catch (error) {

        console.error(
            "Error loading receipt categories:",
            error
        );

        return [];
    }
}


/* =========================
   DISPLAY OFFERS
========================= */

function displayOffers(categories) {

    if (!offersList) {
        return;
    }

    let relevantOffers = offers;

    if (categories.length > 0) {

        const matchedOffers = offers.filter((offer) =>
            categories.some((category) =>
                category.includes(
                    offer.category.toLowerCase()
                ) ||
                offer.category
                    .toLowerCase()
                    .includes(category)
            )
        );

        if (matchedOffers.length > 0) {
            relevantOffers = matchedOffers;
        }
    }

    offersList.innerHTML = "";

    relevantOffers.forEach((offer) => {

        const offerRow = document.createElement("div");

        offerRow.className = "offer-row";

        offerRow.innerHTML = `
            <div class="offer-icon">
                ${offer.icon}
            </div>

            <div class="offer-info">

                <strong>
                    ${offer.title}
                </strong>

                <span>
                    ${offer.description}
                </span>

            </div>

            <span class="offer-badge">
                ${offer.badge}
            </span>
        `;

        offersList.appendChild(offerRow);

    });
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

        // Show demo offers
        displayOffers([]);

        return;
    }

    currentUser = user;

    console.log(
        "Logged-in User UID:",
        user.uid
    );

    const categories =
        await getReceiptCategories();

    displayOffers(categories);

});