const params = new URLSearchParams(window.location.search);

const title = params.get("title");
const category = params.get("category");
const description = params.get("description");
const discount = params.get("discount");


const offerTitle = document.getElementById("offerTitle");
const offerDescription = document.getElementById("offerDescription");
const offerDiscount = document.getElementById("offerDiscount");

const discountText = document.getElementById("discountText");
const categoryText = document.getElementById("categoryText");

const detailCategory = document.getElementById("detailCategory");
const detailDiscount = document.getElementById("detailDiscount");

const offerIcon = document.getElementById("offerIcon");


/* ================================
   BASIC OFFER INFORMATION
================================ */

if (title) {
    offerTitle.textContent = title;
}

if (description) {
    offerDescription.textContent = description;
}

if (discount) {
    offerDiscount.textContent = discount.toUpperCase();
    discountText.textContent = discount;
    detailDiscount.textContent = discount;
}

if (category) {
    categoryText.textContent = category;
    detailCategory.textContent = category;
}


/* ================================
   CATEGORY VISUALS
================================ */

const categoryName = (category || "").toLowerCase();

if (categoryName.includes("electronics")) {

    offerIcon.textContent = "📱";
    document.body.classList.add("electronics-offer");

} else if (categoryName.includes("fashion")) {

    offerIcon.textContent = "👗";
    document.body.classList.add("fashion-offer");

} else if (
    categoryName.includes("home") ||
    categoryName.includes("living")
) {

    offerIcon.textContent = "🏠";
    document.body.classList.add("home-offer");

} else {

    offerIcon.textContent = "🛍️";
    document.body.classList.add("default-offer");

}
/* ================================
   RECOMMENDED OFFER NAVIGATION
================================ */

const recommendedCards =
    document.querySelectorAll(".recommended-card");

recommendedCards.forEach((card) => {

    card.addEventListener("click", () => {

        const selectedCategory =
            card.dataset.category;

        if (selectedCategory === "Electronics") {

            window.location.href =
                "offer-details.html?" +
                new URLSearchParams({
                    title: "Electronics Deals",
                    category: "Electronics",
                    description:
                        "Discover special offers on electronics and gadgets.",
                    discount: "Up to 20% Off"
                });

        } else if (selectedCategory === "Fashion") {

            window.location.href =
                "offer-details.html?" +
                new URLSearchParams({
                    title: "Fashion Offers",
                    category: "Fashion",
                    description:
                        "Discover special offers on fashion and lifestyle products.",
                    discount: "Up to 30% Off"
                });

        } else if (
            selectedCategory === "Home & Living"
        ) {

            window.location.href =
                "offer-details.html?" +
                new URLSearchParams({
                    title: "Home & Living",
                    category: "Home & Living",
                    description:
                        "Explore special offers for your home and everyday needs.",
                    discount: "Special Deal"
                });

        }

    });

});