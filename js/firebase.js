import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";

import {
    initializeAppCheck,
    ReCaptchaEnterpriseProvider
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app-check.js";


// ==========================================
// FIREBASE CONFIGURATION
// ==========================================

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
// ==========================================

const app = initializeApp(firebaseConfig);


// ==========================================
// FIREBASE SERVICES
// ==========================================

const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);


// ==========================================
// EXPORT
// ==========================================

export {
    app,
    auth,
    db,
    storage
};