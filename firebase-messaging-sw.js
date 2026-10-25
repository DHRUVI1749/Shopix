/* global firebase */

importScripts(
    "https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js"
);
importScripts(
    "https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
    apiKey: "AIzaSyAwoHdf7BDZ_rAW9-baFfAkUIzQweJNCgI",
    authDomain: "shopix-f1fee.firebaseapp.com",
    databaseURL: "https://shopix-f1fee-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "shopix-f1fee",
    storageBucket: "shopix-f1fee.firebasestorage.app",
    messagingSenderId: "927255606743",
    appId: "1:927255606743:web:af5dd8de31c134c608c792",
    measurementId: "G-6MQHBPQQX1"
});

firebase.messaging();
