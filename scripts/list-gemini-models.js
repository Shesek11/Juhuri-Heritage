#!/usr/bin/env node

/**
 * רשימת מודלי Gemini זמינים
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
    if (!process.env.GEMINI_API_KEY) {
        console.error('❌ GEMINI_API_KEY not found in .env file');
        return;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    try {
        console.log('🔍 Fetching available Gemini models...\n');

        // Get list of models
        const models = await genAI.listModels();

        console.log(`Found ${models.length} models:\n`);
        console.log('=' .repeat(80));

        models.forEach((model, index) => {
            console.log(`\n${index + 1}. ${model.name}`);
            console.log(`   Display Name: ${model.displayName || 'N/A'}`);
            console.log(`   Description: ${model.description || 'N/A'}`);

            if (model.supportedGenerationMethods) {
                console.log(`   Methods: ${model.supportedGenerationMethods.join(', ')}`);
            }

            // Check if it supports vision (images)
            if (model.name.includes('vision') || model.name.includes('pro') || model.name.includes('flash')) {
                console.log(`   ✅ Likely supports images`);
            }
        });

        console.log('\n' + '='.repeat(80));
        console.log('\n💡 Recommended models for OCR (vision):');
        console.log('   - Look for models with "vision", "pro", or "flash" in the name');
        console.log('   - Models that support "generateContent" method\n');

    } catch (error) {
        console.error('❌ Error fetching models:', error.message);
    }
}

listModels();
