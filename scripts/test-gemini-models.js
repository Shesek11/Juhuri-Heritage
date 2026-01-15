const fetch = require('node-fetch'); // Or use native fetch if Node 18+
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
    if (!API_KEY) {
        console.error('❌ No GEMINI_API_KEY found in .env');
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            console.error('❌ API Error:', data);
            return;
        }

        console.log('✅ Available Models:');
        if (data.models) {
            data.models.forEach(m => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
                    console.log(`- ${m.name}`);
                }
            });
        } else {
            console.log('No models found in response:', data);
        }
    } catch (err) {
        console.error('❌ Request failed:', err.message);
    }
}

listModels();
