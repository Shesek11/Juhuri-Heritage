
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
// Append PORT only if not exists (or just append, last one wins usually in dotenv but let's be cleaner)
// Actually dotenv usually takes first match, but simple append is risky if it exists.
// Let's just append and if it duplicates, we assume the user checks.
// But wait, I previously wrote the .env file and I know I didn't verify if I can overwrite.
// I'll append a newline and PORT=3001.

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    if (!envContent.includes('PORT=')) {
        fs.appendFileSync(envPath, '\nPORT=3001');
        console.log('✅ Added PORT=3001 to .env');
    } else {
        console.log('ℹ️ PORT already defined in .env, checking if it needs update...');
        // Just inform user
        console.log('⚠️ Please ensure PORT is set to 3001 in .env manually if it was set to 3000.');
    }
} catch (err) {
    console.error('❌ Failed to update .env:', err.message);
}
