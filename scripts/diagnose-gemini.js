const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const API_KEY = process.env.GEMINI_API_KEY;
const OUTPUT_FILE = path.resolve(__dirname, 'gemini_diagnosis.json');

console.log('--- Gemini Diagnosis ---');
console.log('API_KEY Length:', API_KEY ? API_KEY.length : 'MISSING');

if (!API_KEY) {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ error: 'Missing API Key' }));
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('Status Code:', res.statusCode);
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ status: res.statusCode, data: json }, null, 2));
            console.log(`Report saved to ${OUTPUT_FILE}`);

            if (json.models) {
                console.log('Available Models:');
                json.models.forEach(m => console.log(`- ${m.name}`));
            } else {
                console.error('No models found in response.');
            }
        } catch (e) {
            console.error('Parse Error:', e);
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ error: 'Parse Error', raw: data }));
        }
    });
}).on('error', (err) => {
    console.error('Request Error:', err);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ error: err.message }));
});
