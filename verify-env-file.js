const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const output = [
    '--- Environment Variables Check ---',
    `DB_HOST: ${process.env.DB_HOST}`,
    `DB_PORT: ${process.env.DB_PORT}`,
    `DB_USERNAME: ${process.env.DB_USERNAME}`,
    `DB_DATABASE: ${process.env.DB_DATABASE}`,
    `DB_PASSWORD: ${process.env.DB_PASSWORD ? '******' : '(missing)'}`,
    `NODE_ENV: ${process.env.NODE_ENV}`,
    `PORT: ${process.env.PORT}`,
    '-----------------------------------'
].join('\n');

fs.writeFileSync('env_output.txt', output);
console.log('Written to env_output.txt');
