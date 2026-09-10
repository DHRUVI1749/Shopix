import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// ==========================================
// YOUR FIREBASE CONFIG
// ==========================================

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAwoHdf7BDZ_rAW9-baFfAkUIzQweJNCgI",
  authDomain: "shopix-f1fee.firebaseapp.com",
  projectId: "shopix-f1fee",
  storageBucket: "shopix-f1fee.firebasestorage.app",
  messagingSenderId: "927255606743",
  appId: "1:927255606743:web:af5dd8de31c134c608c792",
  measurementId: "G-6MQHBPQQX1"
};


// Initialize Firebase

const app = initializeApp(firebaseConfig);


// Firebase Authentication

export const auth = getAuth(app);


// Firestore Database

export const db = getFirestore(app);