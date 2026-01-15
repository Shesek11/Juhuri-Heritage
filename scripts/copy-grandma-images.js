const fs = require('fs');
const path = require('path');

const src1 = 'C:/Users/shimo/.gemini/antigravity/brain/f845aecc-be7e-4950-a037-4a3e2c66bab2/uploaded_image_0_1768342796413.jpg';
const src2 = 'C:/Users/shimo/.gemini/antigravity/brain/f845aecc-be7e-4950-a037-4a3e2c66bab2/uploaded_image_1_1768342796413.jpg';
const dst1 = 'c:/Users/shimo/odrive/BB/ShesekSites-Backups/Dev/juhuri-heritage/public/images/grandma1.jpg';
const dst2 = 'c:/Users/shimo/odrive/BB/ShesekSites-Backups/Dev/juhuri-heritage/public/images/grandma2.jpg';

try {
    fs.copyFileSync(src1, dst1);
    console.log('Copied grandma1.jpg');
} catch (e) {
    console.error('Error copying grandma1:', e.message);
}

try {
    fs.copyFileSync(src2, dst2);
    console.log('Copied grandma2.jpg');
} catch (e) {
    console.error('Error copying grandma2:', e.message);
}

console.log('Done. Checking output:');
console.log(fs.readdirSync('c:/Users/shimo/odrive/BB/ShesekSites-Backups/Dev/juhuri-heritage/public/images'));
