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
