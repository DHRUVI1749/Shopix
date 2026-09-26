// ===============================
// SHOPIX THEME
// ===============================

const savedTheme =
    localStorage.getItem("shopixTheme") || "light";

if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
} else {
    document.body.classList.remove("dark-theme");
}