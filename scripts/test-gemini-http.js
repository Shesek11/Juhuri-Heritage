const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_KEY = process.env.GEMINI_API_KEY;

function listModels() {
    if (!API_KEY) {
        console.error('❌ No GEMINI_API_KEY found in .env');
        // console.log('Current env:', process.env);
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                if (json.error) {
                    console.error('❌ API Error:', json.error);
                } else if (json.models) {
                    console.log('✅ Available Models:');
                    json.models.forEach(m => {
                        if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
                            console.log(`- ${m.name}`);
                        }
                    });
                } else {
                    console.log('No models found:', json);
                }
            } catch (e) {
                console.error('Parse error:', e, data);
            }
        });
    }).on('error', (err) => {
        console.error('Request error:', err);
    });
}

listModels();
