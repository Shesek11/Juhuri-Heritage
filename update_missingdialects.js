const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'components/widgets/MissingDialects.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// The main glowing wrapper
content = content.replace(
    /className="relative bg-\[#0d1424]\/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white\/10 overflow-hidden font-rubik h-full flex flex-col group transition-all duration-500 hover:-translate-y-2 hover:border-amber-500\/40 hover:bg-\[#0d1424]\/90 hover:shadow-\[0_20px_40px_-15px_rgba\(245,158,11,0\.15\)] cursor-pointer"/g,
    `className="relative bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden font-rubik h-full flex flex-col group transition-all duration-500 hover:-translate-y-2 hover:border-amber-500/40 hover:bg-[#0d1424]/90 hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.15)] cursor-pointer"`
);

// Inject ambient hover glow if not present
if (!content.includes('bg-amber-500/10 rounded-full blur-3xl')) {
    content = content.replace(
        '<div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-amber-500/80 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 z-50" />',
        `<div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-amber-500/80 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 z-50" />
            <div className="absolute inset-x-0 -top-20 h-40 bg-amber-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />`
    );
}

// Ensure proper z-indexing so the glow goes behind content
content = content.replace(
    /className="bg-white\/5 border-b border-white\/10 backdrop-blur-xl p-4 text-white"/g,
    'className="bg-white/5 border-b border-white/10 backdrop-blur-xl p-4 text-white relative z-10"'
);

// Replace icon text color
content = content.replace(
    /<Globe size=\{20\} \/> חסרים ניבים/g,
    '<Globe size={20} className="text-amber-500" /> חסרים ניבים'
);

content = content.replace(
    /className="text-xs text-white\/80 mt-1"/g,
    'className="text-xs text-white/60 mt-1"'
);

content = content.replace(
    /className="flex-1 p-2 overflow-y-auto"/g,
    'className="flex-1 p-2 overflow-y-auto relative z-10"'
);

// Item button styling
content = content.replace(
    /className="w-full text-right flex items-center justify-between p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900\/20 transition-all group border border-transparent hover:border-blue-200 dark:hover:border-blue-800"/g,
    'className="w-full text-right flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all group/item border border-transparent hover:border-white/10"'
);

content = content.replace(
    /className="font-bold text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"/g,
    'className="font-bold text-slate-300 group-hover/item:text-amber-400 transition-colors"'
);

// Pill styling
content = content.replace(
    /className="text-\[10px\] bg-blue-100 dark:bg-blue-900\/30 text-blue-600 dark:text-blue-400 px-1\.5 py-0\.5 rounded"/g,
    'className="text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20"'
);

// Plus icon container
content = content.replace(
    /className="bg-blue-100 dark:bg-blue-900\/30 p-2 rounded-lg text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-all"/g,
    'className="bg-amber-500/10 p-2 rounded-lg text-amber-500 opacity-0 group-hover/item:opacity-100 transition-all border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]"'
);

// Bottom button styling
content = content.replace(
    /className="p-3 border-t border-white\/10 text-center hover:bg-slate-50 dark:hover:bg-slate-700\/50 transition-colors"/g,
    'className="p-3 border-t border-white/10 text-center hover:bg-white/5 transition-colors relative z-10"'
);

content = content.replace(
    /className="text-xs text-slate-500 hover:text-blue-600 dark:hover:text-blue-400"/g,
    'className="text-xs text-slate-400 hover:text-amber-500 transition-colors"'
);

fs.writeFileSync(targetPath, content);
console.log('MissingDialects.tsx updated successfully');
