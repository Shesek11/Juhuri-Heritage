
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
const auth0Config = `
VITE_AUTH0_DOMAIN=shesek.eu.auth0.com
VITE_AUTH0_CLIENT_ID=MzyV6tq3WF9uJsAwbuHsXglM2bPuvN92
`;

try {
    fs.appendFileSync(envPath, auth0Config);
    console.log('✅ Auth0 credentials added to .env');
} catch (err) {
    console.error('❌ Failed to update .env:', err.message);
}
