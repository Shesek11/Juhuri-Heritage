
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');

const envContent = `DB_HOST=localhost
DB_USERNAME=root
DB_PASSWORD=
DB_DATABASE=juhuri_dev
DB_PORT=3306
JWT_SECRET=dev_secret_key_123
ADMIN_PASSWORD=admin_pass
GEMINI_API_KEY=
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000,http://localhost:3001,http://localhost:5176,http://localhost:3002
VITE_AUTH0_DOMAIN=shesek.eu.auth0.com
VITE_AUTH0_CLIENT_ID=MzyV6tq3WF9uJsAwbuHsXglM2bPuvN92
PORT=3002
`;

try {
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('✅ Successfully re-wrote .env file');
} catch (err) {
    console.error('❌ Failed to write .env:', err.message);
}
