import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";


// ==========================================
// FIREBASE CONFIGURATION
// ==========================================

const firebaseConfig = {
    apiKey: "AIzaSyAwoHdf7BDZ_rAW9-baFfAkUIzQweJNCgI",
    authDomain: "shopix-f1fee.firebaseapp.com",
    databaseURL: "https://shopix-f1fee-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "shopix-f1fee",
    storageBucket: "shopix-f1fee.firebasestorage.app",
    messagingSenderId: "927255606743",
    appId: "1:927255606743:web:af5dd8de31c134c608c792",
    measurementId: "G-6MQHBPQQX1"
};


// ==========================================
// INITIALIZE FIREBASE
//s ==========================================

const app = initializeApp(firebaseConfig);


// ==========================================
// FIREBASE SERVICES
// ==========================================

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const rtdb = getDatabase(app);


// ==========================================
// PWA MANIFEST
// ==========================================

if (
    typeof document !== "undefined" &&
    !document.querySelector('link[rel="manifest"]')
) {
    const manifestLink = document.createElement("link");

    manifestLink.rel = "manifest";
    manifestLink.href = "/manifest.webmanifest";

    document.head.appendChild(manifestLink);

    const themeColor = document.createElement("meta");

    themeColor.name = "theme-color";
    themeColor.content = "#4f46e5";

    document.head.appendChild(themeColor);
}


// ==========================================
// EXPORT
// ==========================================

export {
    app,
    auth,
    db,
    storage,
    rtdb
};