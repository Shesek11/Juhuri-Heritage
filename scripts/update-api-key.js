const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
const newApiKey = 'AIzaSyDM8O-LwfYIh46R-ZgeCy-a3GxV4uX4Rqw';

try {
    let content = fs.readFileSync(envPath, 'utf8');

    // Replace or add GEMINI_API_KEY
    if (content.includes('GEMINI_API_KEY=')) {
        content = content.replace(/GEMINI_API_KEY=.*/g, `GEMINI_API_KEY=${newApiKey}`);
    } else {
        content += `\nGEMINI_API_KEY=${newApiKey}\n`;
    }

    fs.writeFileSync(envPath, content);
    console.log('✅ GEMINI_API_KEY updated successfully!');
    console.log('🔑 New key starts with:', newApiKey.substring(0, 8) + '...');
} catch (err) {
    console.error('❌ Error:', err.message);
}
