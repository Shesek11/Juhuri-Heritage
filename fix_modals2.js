const fs = require('fs');
const path = require('path');

const directories = [
    path.join(__dirname, 'components'),
    path.join(__dirname, 'components', 'family'),
    path.join(__dirname, 'components', 'marketplace')
];

const replacements = [
    // AuthModal & ContributeModal generic inputs
    { from: /bg-white dark:bg-slate-700/g, to: "bg-white/5 backdrop-blur-sm" },
    { from: /border-slate-200 dark:border-slate-600/g, to: "border-white/10" },
    { from: /border-slate-300 dark:border-slate-600/g, to: "border-white/10" },
    // EditMemberModal generic inputs
    { from: /border dark:bg-slate-700 dark:border-slate-600/g, to: "border border-white/10 bg-white/5 backdrop-blur-sm text-white" },
    // EditMemberModal inner panels
    { from: /bg-slate-50 dark:bg-slate-800/g, to: "bg-white/5 backdrop-blur-sm" },
    { from: /border dark:border-slate-700/g, to: "border border-white/10" },
    // EditMemberModal header
    { from: /bg-amber-50 dark:bg-amber-900\/20/g, to: "bg-gradient-to-r from-amber-500\/10 to-orange-500\/5" },
    { from: /text-slate-100/g, to: "text-amber-500" }, // For the header title text
    // ProfileModal generic styling
    { from: /bg-slate-200 dark:bg-slate-700/g, to: "bg-white/10" },
];

function processDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (!fs.statSync(fullPath).isDirectory() && file.endsWith('Modal.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;

            replacements.forEach(rep => {
                content = content.replace(rep.from, rep.to);
            });

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content);
                console.log(`Updated ${file}`);
            }
        }
    }
}

directories.forEach(processDirectory);
console.log('Done!');
