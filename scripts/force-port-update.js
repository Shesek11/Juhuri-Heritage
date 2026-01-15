
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '../.env');

try {
    let envContent = fs.readFileSync(envPath, 'utf8');
    // Replace PORT=... with PORT=3002
    if (envContent.match(/PORT=\d+/)) {
        envContent = envContent.replace(/PORT=\d+/, 'PORT=3002');
    } else {
        envContent += '\nPORT=3002';
    }
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Updated .env to PORT=3002');
} catch (err) {
    console.error('❌ Failed to update .env:', err.message);
}
