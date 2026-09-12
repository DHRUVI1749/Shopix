import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";
import {
    initializeAppCheck,
    ReCaptchaEnterpriseProvider
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app-check.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAwoHdf7BDZ_rAW9-baFfAkUIzQweJNCgI",
  authDomain: "shopix-f1fee.firebaseapp.com",
  projectId: "shopix-f1fee",
  storageBucket: "shopix-f1fee.firebasestorage.app",
  messagingSenderId: "927255606743",
  appId: "1:927255606743:web:af5dd8de31c134c608c792",
  measurementId: "G-6MQHBPQQX1"
};

const app = initializeApp(firebaseConfig);

// Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };