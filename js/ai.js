// ==========================================
// SHOPIX - FIREBASE AI LOGIC
// ==========================================

import {
    getAI,
    getGenerativeModel,
    GoogleAIBackend
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-ai.js";

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
    model: "gemini-3.7-flash"
});


console.log("Gemini AI module loaded successfully!");


// ==========================================
// EXPORT MODEL
// ==========================================

export { model };