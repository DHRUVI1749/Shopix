// ===============================
// FAQ ACCORDION
// ===============================

const faqQuestions = document.querySelectorAll(".faq-question");

faqQuestions.forEach((question) => {

    question.addEventListener("click", () => {

        const currentItem = question.closest(".faq-item");

        // Close other FAQ items
        document.querySelectorAll(".faq-item").forEach((item) => {

            if (item !== currentItem) {
                item.classList.remove("active");
            }

        });

        // Toggle current FAQ
        currentItem.classList.toggle("active");

    });

});


// ===============================
// THEME
// ===============================

function applyTheme(theme) {

    if (theme === "dark") {
        document.body.classList.add("dark-theme");
    } else {
        document.body.classList.remove("dark-theme");
    }

}


// Load the theme saved from Settings
const savedTheme =
    localStorage.getItem("shopixTheme") || "light";

applyTheme(savedTheme);