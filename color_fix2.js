const fs = require('fs');

function replaceColors(file) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // D3 node colors
    content = content.replace(/#a855f7/g, '#14b8a6'); // purple-500/600 to teal-500

    // Tailwind classes
    content = content.replace(/bg-purple-/g, 'bg-teal-');
    content = content.replace(/text-purple-/g, 'text-teal-');
    content = content.replace(/border-purple-/g, 'border-teal-');
    content = content.replace(/accent-purple-/g, 'accent-teal-');

    // Also any bg-white inside family/Dictionary
    content = content.replace(/bg-white\s+dark:bg-slate-800/g, 'bg-[#0d1424]/60 backdrop-blur-xl border border-white/10');

    // Let's also check for fill-white or bg-slate-50
    content = content.replace(/bg-slate-50\s+dark:bg-slate-900\/50/g, 'bg-white/5 border border-white/10');
    content = content.replace(/bg-white\/50\s+dark:bg-slate-900\/50/g, 'bg-white/5 border border-white/10');

    if (original !== content) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed colors in', file);
    }
}

replaceColors('c:\\dev\\juhuri-heritage\\components\\family\\CommunityGraph.tsx');
replaceColors('c:\\dev\\juhuri-heritage\\components\\family\\EditMemberModal.tsx');
replaceColors('c:\\dev\\juhuri-heritage\\components\\DictionaryPage.tsx');
replaceColors('c:\\dev\\juhuri-heritage\\components\\ResultCard.tsx');
