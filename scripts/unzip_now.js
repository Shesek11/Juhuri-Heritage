const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const zipPath = path.join(__dirname, 'public', 'images', 'stitch_juhuri_heritage_design_system.zip');
const outDir = path.join(__dirname, 'extract-tmp');

try {
    fs.mkdirSync(outDir, { recursive: true });
    console.log('Created extraction directory');
    execSync(`tar -xf "${zipPath}" -C "${outDir}"`);
    console.log('Extraction complete');
} catch (e) {
    console.error('Failed', e);
}
