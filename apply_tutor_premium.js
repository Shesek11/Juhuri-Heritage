const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    replacements.forEach(rep => {
        content = content.replace(rep.from, rep.to);
    });

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${path.basename(filePath)}`);
    } else {
        console.log(`No changes made to ${path.basename(filePath)}`);
    }
}

const tutorReplacements = [
    { from: /bg-indigo-100 dark:bg-indigo-900\/30 rounded-full mb-4 text-indigo-600 dark:text-indigo-400/g, to: 'bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-4 text-amber-500 shadow-lg shadow-amber-500/20' },
    { from: /bg-\[url\('https:\/\/www\.transparenttextures\.com\/patterns\/cubes\.png'\)\] bg-white\/5 p-8 relative/g, to: 'bg-white/5 p-8 relative' },
    { from: /<div className="absolute inset-0 bg-slate-50\/90 dark:bg-slate-900\/90 pointer-events-none"><\/div>/g, to: '<div className="absolute inset-0 bg-transparent pointer-events-none"></div>' },
    { from: /bg-indigo-500 border-indigo-700 text-white/g, to: 'bg-gradient-to-br from-amber-400 to-orange-600 border-orange-700 shadow-[0_0_20px_rgba(245,158,11,0.4)] text-[#050B14]' },
    { from: /bg-yellow-400 border-yellow-600 text-white/g, to: 'bg-emerald-500 border-emerald-700 shadow-[0_0_20px_rgba(16,185,129,0.4)] text-[#050B14]' },
    { from: /bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-400/g, to: 'bg-white/5 border-white/10 text-white/40' },
    { from: /border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900\/30 dark:text-indigo-300 dark:border-indigo-400/g, to: 'border-amber-500/50 bg-amber-500/10 text-amber-500' },
    { from: /hover:border-indigo-300/g, to: 'hover:border-amber-500/50' },
    { from: /bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-xl shadow-xl shadow-indigo-500\/20/g, to: 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-600 text-[#050B14] font-bold text-lg rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:shadow-[0_0_40px_rgba(245,158,11,0.5)]' },
    { from: /bg-slate-900/g, to: 'bg-white/5 border-b border-white/10 backdrop-blur-md' },
    { from: /bg-indigo-600 p-4 flex/g, to: 'bg-white/5 border-b border-white/10 backdrop-blur-md p-4 flex text-amber-500' },
    { from: /text-white shadow-md z-10 flex justify-between/g, to: 'shadow-md z-10 flex justify-between' },
    { from: /text-slate-100 flex items-center/g, to: 'text-amber-500 flex items-center' },
    { from: /bg-indigo-700 hover:bg-indigo-800/g, to: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20' },
    { from: /bg-indigo-600 text-white rounded-br-none/g, to: 'bg-gradient-to-br from-amber-400 to-orange-500 text-[#050B14] font-medium rounded-br-none shadow-md' },
    { from: /bg-white dark:bg-slate-700 text-slate-100/g, to: 'bg-white/10 backdrop-blur-md text-white border border-white/10' },
    { from: /bg-slate-100 dark:bg-slate-900/g, to: 'bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:border-amber-500/50 transition-colors' },
    { from: /bg-indigo-600 text-white rounded-xl/g, to: 'bg-gradient-to-br from-amber-400 to-orange-600 text-[#050B14] rounded-xl hover:shadow-[0_0_15px_rgba(245,158,11,0.4)]' },
    { from: /bg-indigo-50 dark:bg-indigo-900\/30 text-indigo-700 dark:text-indigo-300 px-6 py-3/g, to: 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-amber-500 px-6 py-3' },
    { from: /hover:bg-indigo-100 dark:hover:bg-indigo-900\/50/g, to: 'hover:bg-amber-500/20 hover:border-amber-500/40 shadow-lg' },
    { from: /flex-1 overflow-y-auto p-4 space-y-4 bg-white\/5\/50 scroll-smooth/g, to: 'flex-1 overflow-y-auto p-4 space-y-4 bg-transparent scroll-smooth' },
    { from: /bg-indigo-50 text-indigo-600/g, to: 'bg-amber-500/10 text-amber-500 border border-amber-500/20' }
];

const lessonReplacements = [
    { from: /text-indigo-500/g, to: 'text-amber-500' },
    { from: /hover:bg-slate-200 dark:hover:bg-slate-700/g, to: 'hover:bg-white/10 text-slate-300 hover:text-white' },
    { from: /bg-slate-200 dark:bg-slate-700/g, to: 'bg-white/10' },
    { from: /bg-indigo-100 dark:bg-indigo-900\/30 text-indigo-600 dark:text-indigo-400/g, to: 'bg-amber-500/10 text-amber-500 border border-amber-500/20' },
    { from: /hover:bg-slate-50 dark:hover:bg-slate-700/g, to: 'hover:bg-white/5 hover:border-amber-500/50 focus:border-amber-500/50 focus:bg-white/10' },
    { from: /border-slate-200 dark:border-slate-600 bg-\[#0d1424\]\/60 backdrop-blur-xl text-slate-700 dark:text-slate-200 hover:border-indigo-400/g, to: 'border-white/10 bg-white/5 backdrop-blur-xl text-slate-200 hover:border-amber-500/40 hover:bg-white/10' },
    { from: /bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500\/30/g, to: 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-600 text-[#050B14] font-bold px-8 py-3 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-105' },
    { from: /bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform/g, to: 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-600 text-[#050B14] px-8 py-3 rounded-xl font-bold hover:scale-105 shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-transform' }
];

replaceInFile(path.join(__dirname, 'components/TutorMode.tsx'), tutorReplacements);
replaceInFile(path.join(__dirname, 'components/LessonView.tsx'), lessonReplacements);
