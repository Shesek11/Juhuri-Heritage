const fs = require('fs');
const path = require('path');
const dir = 'c:\\dev\\juhuri-heritage\\components\\widgets';

const oldClass = 'bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden font-rubik h-full flex flex-col';
const newClass = 'relative bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden font-rubik h-full flex flex-col group transition-all duration-500 hover:-translate-y-2 hover:border-amber-500/40 hover:bg-[#0d1424]/90 hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.15)] cursor-pointer';

const topGlowLine = '<div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-amber-500/80 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 z-50" />';

fs.readdirSync(dir).forEach(f => {
    if (f.endsWith('.tsx')) {
        const filePath = path.join(dir, f);
        let content = fs.readFileSync(filePath, 'utf8');

        if (content.includes(oldClass)) {
            content = content.replace(oldClass, newClass);

            // Insert the glow line right after the opening div of this class
            content = content.replace(newClass + '">', newClass + '">\n            ' + topGlowLine);

            fs.writeFileSync(filePath, content, 'utf8');
            console.log('Updated ' + f);
        } else if (content.includes('bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden group hover:shadow-xl transition-all font-rubik h-full flex flex-col cursor-pointer')) {
            // WordOfTheDay.tsx has a custom class
            const oldWod = 'bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden group hover:shadow-xl transition-all font-rubik h-full flex flex-col cursor-pointer';

            content = content.replace(oldWod, newClass);
            content = content.replace(newClass + '">', newClass + '">\n            ' + topGlowLine);

            fs.writeFileSync(filePath, content, 'utf8');
            console.log('Updated ' + f);
        } else {
            console.log('Could not find wrapper in ' + f);
        }
    }
});
