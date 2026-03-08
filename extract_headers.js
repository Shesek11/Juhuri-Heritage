const fs = require('fs');
const path = require('path');
const dir = 'c:\\dev\\juhuri-heritage\\components\\widgets';

fs.readdirSync(dir).forEach(f => {
    if (f.endsWith('.tsx')) {
        const content = fs.readFileSync(path.join(dir, f), 'utf8');
        // Match the header div block
        const match = content.match(/<div className="bg-white\/5 border-b border-white\/10 backdrop-blur-xl.*?<\/div>/s);
        if (match) {
            console.log(`\n--- ${f} ---\n${match[0]}`);
        }
    }
});
