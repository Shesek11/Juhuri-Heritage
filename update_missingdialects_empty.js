const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'components/widgets/MissingDialects.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

const targetEmptyState = `    if (entries.length === 0) {
        return (
            <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden h-full flex flex-col">
                <div className="p-6 border-b border-white/10 flex flex-col items-center justify-center text-center h-40 bg-[#0d1424]/40 relative group-hover:bg-[#0d1424]/60 transition-colors">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-3 text-white">
                        <Globe size={24} />
                    </div>
                    <h3 className="font-bold text-lg text-white">חסרים ניבים</h3>
                    <p className="text-xs text-white/50 mt-1 line-clamp-1">מילים שחסרות בחלק מהניבים</p>
                </div>
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm p-4">
                    כל המילים מכילות את כל הניבים! 🌍
                </div>
            </div>
        );
    }`;

const newEmptyState = `    if (entries.length === 0) {
        return (
            <div className="relative bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden font-rubik h-full flex flex-col group transition-all duration-500 hover:-translate-y-2 hover:border-amber-500/40 hover:bg-[#0d1424]/90 hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.15)] cursor-pointer">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-amber-500/80 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 z-50" />
                <div className="absolute inset-x-0 -top-20 h-40 bg-amber-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                
                <div className="p-6 border-b border-white/10 flex flex-col items-center justify-center text-center h-40 bg-[#0d1424]/40 relative group-hover:bg-[#0d1424]/60 transition-colors z-10">
                    <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-3 text-amber-500 group-hover:scale-110 transition-transform">
                        <Globe size={24} />
                    </div>
                    <h3 className="font-bold text-lg text-white">חסרים ניבים</h3>
                    <p className="text-xs text-white/50 mt-1 line-clamp-1">מילים שחסרות בחלק מהניבים</p>
                </div>
                <div className="flex-1 flex items-center justify-center text-amber-500/70 text-sm p-4 z-10 font-medium">
                    כל המילים מכילות את כל הניבים! 🌍
                </div>
            </div>
        );
    }`;

if (content.includes('bg-gradient-to-br from-blue-400')) {
    content = content.replace(targetEmptyState, newEmptyState);
    fs.writeFileSync(targetPath, content);
    console.log('Empty state updated successfully.');
} else {
    // Attempt fallback replacement using Regex if exact string fails
    content = content.replace(
        /className="bg-\[#0d1424]\/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white\/10 overflow-hidden h-full flex flex-col"/g,
        'className="relative bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden font-rubik h-full flex flex-col group transition-all duration-500 hover:-translate-y-2 hover:border-amber-500/40 hover:bg-[#0d1424]/90 hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.15)] cursor-pointer"\n                >\n                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-amber-500/80 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 z-50" />\n                <div className="absolute inset-x-0 -top-20 h-40 bg-amber-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />'
    );

    // Add z-index to children
    content = content.replace(
        /className="p-6 border-b border-white\/10 flex flex-col items-center justify-center text-center h-40 bg-\[#0d1424]\/40 relative group-hover:bg-\[#0d1424]\/60 transition-colors"/g,
        'className="p-6 border-b border-white/10 flex flex-col items-center justify-center text-center h-40 bg-[#0d1424]/40 relative group-hover:bg-[#0d1424]/60 transition-colors z-10"'
    );

    content = content.replace(
        /className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500\/20 mb-3 text-white"/g,
        'className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-3 text-amber-500 group-hover:scale-110 transition-transform"'
    );

    content = content.replace(
        /className="flex-1 flex items-center justify-center text-slate-400 text-sm p-4"/g,
        'className="flex-1 flex items-center justify-center text-amber-500/70 text-sm p-4 z-10 font-medium"'
    );

    // Clean up if we ended up with an extra `>` from replacement
    content = content.replace(/cursor-pointer"\n                >\n                <div/g, 'cursor-pointer">\n                <div');

    fs.writeFileSync(targetPath, content);
    console.log('Empty state updated via regex fallback.');
}
