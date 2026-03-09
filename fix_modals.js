const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'components');

const replacements = [
    // Inputs and textareas
    { from: /dark:bg-slate-700/g, to: "bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:bg-white/10 focus:border-amber-500/50" },
    { from: /dark:border-slate-600/g, to: "border-white/10" },
    { from: /bg-slate-50 dark:bg-slate-800/g, to: "bg-white/5 backdrop-blur-sm border-white/10" },
    { from: /dark:border-slate-700/g, to: "border-white/10" },
    { from: /bg-slate-200 dark:bg-slate-700/g, to: "bg-white/10 border-white/10" },

    // Specific tabs or headers
    { from: /bg-amber-50 dark:bg-amber-900\/20/g, to: "bg-gradient-to-r from-amber-500/10 to-orange-500/5 border-b border-white/10 text-amber-500" },
    // specific to EditMemberModal inner content
    { classNameRegex: /className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"/g, replaceWith: 'className="w-full px-4 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none backdrop-blur-sm"' }
];

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (file.endsWith('Modal.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;

            replacements.forEach(rep => {
                if (rep.from) {
                    content = content.replace(rep.from, rep.to);
                }
                if (rep.classNameRegex) {
                    content = content.replace(rep.classNameRegex, rep.replaceWith);
                }
            });

            // Special handling for the header in EditMemberModal
            content = content.replace(/className="p-4 border-b border-white\/10 flex justify-between items-center bg-amber-50 dark:bg-amber-900\/20"/g, 'className="p-5 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-amber-500/10 to-orange-500/10"');
            content = content.replace(/className="text-xl font-bold text-slate-100 flex items-center gap-2"/g, 'className="text-xl font-bold text-amber-500 flex items-center gap-2"');

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content);
                console.log(`Updated ${file}`);
            }
        }
    }
}

processDirectory(componentsDir);
console.log('Done!');
