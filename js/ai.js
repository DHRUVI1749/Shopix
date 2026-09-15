// ==========================================
// SHOPIX - FIREBASE AI LOGIC
// ==========================================

import {
    getAI,
    getGenerativeModel,
    GoogleAIBackend
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-ai.js";

import { app } from "./firebase.js";


// ==========================================
// INITIALIZE FIREBASE AI
// ==========================================

const ai = getAI(app, {
    backend: new GoogleAIBackend()
});


// ==========================================
// GEMINI MODEL
// ==========================================

const model = getGenerativeModel(ai, {
    model: "gemini-3.5-flash-lite"
});


// ==========================================
// EXPORT
// ==========================================

export {
    model
};


console.log("Firebase AI Logic connected successfully!");