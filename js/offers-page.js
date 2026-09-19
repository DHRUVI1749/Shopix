const offerButtons = document.querySelectorAll("button");

offerButtons.forEach((button) => {

    if (button.textContent.trim() !== "View Offer") {
        return;
    }

    button.addEventListener("click", () => {

        const card = button.closest(".offer-card");

        if (!card) {
            return;
        }

        const title =
            card.querySelector("h3")?.textContent.trim() ||
            "Shopping Offer";

        const category =
            card.querySelector(".offer-category")?.textContent.trim() ||
            "Shopping";

        const description =
            card.querySelector("p")?.textContent.trim() ||
            "Special shopping offer";

        const badge =
            card.querySelector(".offer-badge")?.textContent.trim() ||
            "Special Deal";

        alert(
            `${title}\n\n` +
            `Category: ${category}\n` +
            `Offer: ${badge}\n` +
            `Details: ${description}\n` +
            `Type: Demo Offer`
        );
    });

});