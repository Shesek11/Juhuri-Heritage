// Direct test - bypassing .env entirely
const https = require('https');

const API_KEY = 'AIzaSyDM8O-LwfYIh46R-ZgeCy-a3GxV4uX4Rqw';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

console.log('Testing API Key directly (not from .env)...');
console.log('Key:', API_KEY.substring(0, 10) + '...');

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        try {
            const json = JSON.parse(data);
            if (json.models) {
                console.log('✅ API KEY IS VALID!');
                console.log('Available models:');
                json.models.slice(0, 5).forEach(m => console.log('  -', m.name));
            } else if (json.error) {
                console.log('❌ API Error:', json.error.message);
            }
        } catch (e) {
            console.log('Raw response:', data.substring(0, 200));
        }
    });
}).on('error', err => console.error('Request failed:', err.message));
