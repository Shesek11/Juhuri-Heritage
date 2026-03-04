#!/usr/bin/env node

/**
 * בדיקה מהירה - האם Gemini עובד?
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testModel(modelName) {
    console.log(`\n🧪 Testing model: ${modelName}`);

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: modelName });

        const result = await model.generateContent("Say hello in one word");
        const response = await result.response;
        const text = response.text();

        console.log(`✅ SUCCESS! Model responded: ${text.substring(0, 50)}`);
        return true;
    } catch (e) {
        console.log(`❌ FAILED: ${e.message}`);
        return false;
    }
}

async function checkAll() {
    console.log('🔍 Testing Gemini API...\n');
    console.log(`API Key: ${process.env.GEMINI_API_KEY ? '✓ Found' : '✗ Missing'}\n`);

    const modelsToTest = [
        'gemini-1.5-flash-001',
        'gemini-1.5-flash-latest',
        'gemini-1.5-flash',
        'gemini-pro-vision',
        'gemini-pro'
    ];

    console.log('Testing models in order of recommendation:\n');

    for (const modelName of modelsToTest) {
        const success = await testModel(modelName);
        if (success) {
            console.log(`\n🎉 RECOMMENDATION: Use this model in your .env:`);
            console.log(`   GEMINI_MODEL=${modelName}\n`);
            break;
        }

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

checkAll().catch(error => {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
});
