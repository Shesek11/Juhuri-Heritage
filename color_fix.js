const fs = require('fs');

function replaceColors(file) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // D3 node colors
    content = content.replace(/#ec4899/g, '#f59e0b'); // pink-500 to amber-500
    content = content.replace(/#3b82f6/g, '#6366f1'); // blue-500 to indigo-500

    // Tailwind classes
    content = content.replace(/bg-pink-/g, 'bg-amber-');
    content = content.replace(/text-pink-/g, 'text-amber-');
    content = content.replace(/border-pink-/g, 'border-amber-');
    content = content.replace(/accent-pink-/g, 'accent-amber-');

    content = content.replace(/bg-blue-/g, 'bg-indigo-');
    content = content.replace(/text-blue-/g, 'text-indigo-');
    content = content.replace(/border-blue-/g, 'border-indigo-');
    content = content.replace(/accent-blue-/g, 'accent-indigo-');

    // Any remaining generic white/slate backgrounds in dictionary
    content = content.replace(/bg-white\s+dark:bg-slate-800/g, 'bg-[#0d1424]/60 backdrop-blur-xl');
    content = content.replace(/bg-slate-50\s+dark:bg-slate-700/g, 'bg-white/5');

    if (original !== content) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed colors in', file);
    }
}

replaceColors('c:\\dev\\juhuri-heritage\\components\\family\\CommunityGraph.tsx');
replaceColors('c:\\dev\\juhuri-heritage\\components\\family\\EditMemberModal.tsx');
replaceColors('c:\\dev\\juhuri-heritage\\components\\DictionaryPage.tsx');
replaceColors('c:\\dev\\juhuri-heritage\\components\\ResultCard.tsx');

