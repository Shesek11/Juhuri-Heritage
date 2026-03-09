const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'components/widgets/MissingDialects.tsx');
const lines = fs.readFileSync(targetPath, 'utf8').split('\n');

const newLines = `    if (entries.length === 0) {
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
    }`.split('\n');

// Replace lines 56 to 72 (index 56 to 71)
lines.splice(56, 16, ...newLines);

fs.writeFileSync(targetPath, lines.join('\n'));
console.log('Empty state forced update successful.');
