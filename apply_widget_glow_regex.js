const fs = require('fs');
const path = require('path');
const dir = 'c:\\dev\\juhuri-heritage\\components\\widgets';

const replacements = {
    'CommunityTicker.tsx': `<div className="p-6 border-b border-white/10 flex flex-col items-center justify-center text-center h-40 bg-[#0d1424]/40 relative group-hover:bg-[#0d1424]/60 transition-colors">
                <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2 py-0.5 bg-white/10 rounded-full">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    <span className="text-[10px] font-medium text-white">LIVE</span>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-3 text-white">
                    <Activity size={24} />
                </div>
                <h3 className="font-bold text-lg text-white">קורה עכשיו</h3>
                <p className="text-xs text-white/50 mt-1 line-clamp-1">פעילות הקהילה בזמן אמת</p>
            </div>`,
    'HebrewOnlyWidget.tsx': `<div className="p-6 border-b border-white/10 flex flex-col items-center justify-center text-center h-40 bg-[#0d1424]/40 relative group-hover:bg-[#0d1424]/60 transition-colors">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-3 text-white">
                    <Languages size={24} />
                </div>
                <h3 className="font-bold text-lg text-white">חסר ג'והורי</h3>
                <p className="text-xs text-white/50 mt-1 line-clamp-1">מילים עם עברית בלבד</p>
            </div>`,
    'JuhuriOnlyWidget.tsx': `<div className="p-6 border-b border-white/10 flex flex-col items-center justify-center text-center h-40 bg-[#0d1424]/40 relative group-hover:bg-[#0d1424]/60 transition-colors">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20 mb-3 text-white">
                    <BookText size={24} />
                </div>
                <h3 className="font-bold text-lg text-white">חסר עברית</h3>
                <p className="text-xs text-white/50 mt-1 line-clamp-1">מילים עם ג'והורי בלבד</p>
            </div>`,
    'MissingAudioWidget.tsx': `<div className="p-6 border-b border-white/10 flex flex-col items-center justify-center text-center h-40 bg-[#0d1424]/40 relative group-hover:bg-[#0d1424]/60 transition-colors">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20 mb-3 text-white">
                    <Mic size={24} />
                </div>
                <h3 className="font-bold text-lg text-white">חסרה הקלטה</h3>
                <p className="text-xs text-white/50 mt-1 line-clamp-1">עזרו לנו להקליט הגיות</p>
            </div>`,
    'MissingDialects.tsx': `<div className="p-6 border-b border-white/10 flex flex-col items-center justify-center text-center h-40 bg-[#0d1424]/40 relative group-hover:bg-[#0d1424]/60 transition-colors">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-3 text-white">
                        <Globe size={24} />
                    </div>
                    <h3 className="font-bold text-lg text-white">חסרים ניבים</h3>
                    <p className="text-xs text-white/50 mt-1 line-clamp-1">מילים שחסרות בחלק מהניבים</p>
                </div>`,
    'NeedsTranslation.tsx': `<div className="p-6 border-b border-white/10 flex flex-col items-center justify-center text-center h-40 bg-[#0d1424]/40 relative group-hover:bg-[#0d1424]/60 transition-colors">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-3 text-white">
                        <Languages size={24} />
                    </div>
                    <h3 className="font-bold text-lg text-white">מחכות לתרגום</h3>
                    <p className="text-xs text-white/50 mt-1 line-clamp-1">מילים הממתינות לתרגום מלא</p>
                </div>`,
    'PendingApprovals.tsx': `<div className="p-6 border-b border-white/10 flex flex-col items-center justify-center text-center h-40 bg-[#0d1424]/40 relative group-hover:bg-[#0d1424]/60 transition-colors">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20 mb-3 text-white">
                        <CheckCircle size={24} />
                    </div>
                    <h3 className="font-bold text-lg text-white">ממתינים לאישור</h3>
                    <p className="text-xs text-white/50 mt-1 line-clamp-1">הצעות הממתינות לעורך</p>
                </div>`,
    'RecentAdditions.tsx': `<div className="p-6 border-b border-white/10 flex flex-col items-center justify-center text-center h-40 bg-[#0d1424]/40 relative group-hover:bg-[#0d1424]/60 transition-colors">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20 mb-3 text-white">
                    <Clock size={24} />
                </div>
                <h3 className="font-bold text-lg text-white">נוספו לאחרונה</h3>
                <p className="text-xs text-white/50 mt-1 line-clamp-1">צפה בכל המילים החדשות</p>
            </div>`,
    'WordOfTheDay.tsx': `<div className="p-6 border-b border-white/10 flex flex-col items-center justify-center text-center h-40 bg-[#0d1424]/40 relative group-hover:bg-[#0d1424]/60 transition-colors">
                <div className="absolute top-4 left-4 text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/80">
                    {new Date().toLocaleDateString('he-IL')}
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-3 text-white">
                    <span className="text-2xl drop-shadow-md">☀️</span>
                </div>
                <h3 className="font-bold text-lg text-white">המילה היומית</h3>
                <p className="text-xs text-white/50 mt-1 line-clamp-1">למד מילה ביום</p>
            </div>`
};

Object.entries(replacements).forEach(([file, newCode]) => {
    const filePath = path.join(dir, file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');

        // Replace using regex that spans multiple lines to capture the entire header block
        const updatedContent = content.replace(
            /<div className="bg-white\/5 border-b border-white\/10 backdrop-blur-xl.*?<\/div>/s,
            newCode
        );

        if (content !== updatedContent) {
            fs.writeFileSync(filePath, updatedContent, 'utf8');
            console.log(`Successfully updated ${file}`);
        } else {
            console.log(`Failed to find target regex block in ${file}`);
        }
    }
});
