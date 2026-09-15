// ==========================================
// SHOPIX - AI CONNECTION TEST
// ==========================================

import { model } from "./ai.js";


// ==========================================
// TEST GEMINI CONNECTION
// ==========================================

async function testAIConnection() {

    console.log("Testing Gemini AI connection...");

    try {

        const result = await model.generateContent(
            "Reply with exactly: SHOPIX AI WORKING"
        );

        const response = result.response;

        const text = response.text();

        console.log("Gemini response:", text);

        console.log("✅ SHOPIX AI CONNECTION SUCCESSFUL!");

    } catch (error) {

        console.error(
            "❌ SHOPIX AI CONNECTION FAILED:",
            error
        );

    }
}


testAIConnection();