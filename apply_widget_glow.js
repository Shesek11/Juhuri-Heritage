const fs = require('fs');
const path = require('path');
const dir = 'c:\\dev\\juhuri-heritage\\components\\widgets';

const replacements = {
    'CommunityTicker.tsx': [
        `<div className="bg-white/5 border-b border-white/10 backdrop-blur-xl p-4 text-white flex justify-between items-center">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <Activity size={20} /> קורה עכשיו
                </h3>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/20 rounded-full">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    <span className="text-[10px] font-medium">LIVE</span>
                </div>
            </div>`,
        `<div className="p-6 border-b border-white/10 flex flex-col items-center justify-center text-center h-36 bg-white/5 relative group-hover:bg-white/10 transition-colors">
                <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2 py-0.5 bg-white/10 rounded-full">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    <span className="text-[10px] font-medium text-white">LIVE</span>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-3 text-white">
                    <Activity size={24} />
                </div>
                <h3 className="font-bold text-lg text-white">קורה עכשיו</h3>
                <p className="text-xs text-white/50 mt-1 line-clamp-1">פעילות מחברי הקהילה בזמן אמת</p>
            </div>`
    ],
    'HebrewOnlyWidget.tsx': [
        `<div className="bg-white/5 border-b border-white/10 backdrop-blur-xl p-4 text-white">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <Languages size={20} /> חסר ג'והורי
                </h3>
                <p className="text-xs text-white/80 mt-1">מילים עם עברית בלבד</p>
            </div>`,
        `<div className="p-6 border-b border-white/10 flex flex-col items-center justify-center text-center h-36 bg-white/5 relative group-hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-3 text-white">
                    <Languages size={24} />
                </div>
                <h3 className="font-bold text-lg text-white">חסר ג'והורי</h3>
                <p className="text-xs text-white/60 mt-1 line-clamp-1">מילים עם עברית בלבד</p>
            </div>`
    ],
    'JuhuriOnlyWidget.tsx': [
        `<div className="bg-white/5 border-b border-white/10 backdrop-blur-xl p-4 text-white">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <BookText size={20} /> חסר עברית
                </h3>
                <p className="text-xs text-white/80 mt-1">מילים עם ג'והורי בלבד</p>
            </div>`,
        `<div className="p-6 border-b border-white/10 flex flex-col items-center justify-center text-center h-36 bg-white/5 relative group-hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20 mb-3 text-white">
                    <BookText size={24} />
                </div>
                <h3 className="font-bold text-lg text-white">חסר עברית</h3>
                <p className="text-xs text-white/60 mt-1 line-clamp-1">מילים עם ג'והורי בלבד</p>
            </div>`
    ],
    'MissingAudioWidget.tsx': [
        `<div className="bg-white/5 border-b border-white/10 backdrop-blur-xl p-4 text-white">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <Mic size={20} /> חסרה הקלטה
                </h3>
                <p className="text-xs text-white/80 mt-1">עזרו לנו להקליט הגיות</p>
            </div>`,
        `<div className="p-6 border-b border-white/10 flex flex-col items-center justify-center text-center h-36 bg-white/5 relative group-hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20 mb-3 text-white">
                    <Mic size={24} />
                </div>
                <h3 className="font-bold text-lg text-white">חסרה הקלטה</h3>
                <p className="text-xs text-white/60 mt-1 line-clamp-1">עזרו לנו להקליט הגיות</p>
            </div>`
    ],
    'MissingDialects.tsx': [
        `<div className="bg-white/5 border-b border-white/10 backdrop-blur-xl p-4 text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Globe size={20} /> חסרים ניבים
                    </h3>
                </div>`,
        `<div className="p-6 border-b border-white/10 flex flex-col items-center justify-center text-center h-36 bg-white/5 relative group-hover:bg-white/10 transition-colors">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-3 text-white">
                        <Globe size={24} />
                    </div>
                    <h3 className="font-bold text-lg text-white">חסרים ניבים</h3>
                    <p className="text-xs text-white/60 mt-1 line-clamp-1">אילו מילים חסרות בניבים שונים?</p>
                </div>`
    ],
    'NeedsTranslation.tsx': [
        `<div className="bg-white/5 border-b border-white/10 backdrop-blur-xl p-4 text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Languages size={20} /> מחכות לתרגום
                    </h3>
                </div>`,
        `<div className="p-6 border-b border-white/10 flex flex-col items-center justify-center text-center h-36 bg-white/5 relative group-hover:bg-white/10 transition-colors">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-3 text-white">
                        <Languages size={24} />
                    </div>
                    <h3 className="font-bold text-lg text-white">מחכות לתרגום</h3>
                    <p className="text-xs text-white/60 mt-1 line-clamp-1">מילים הממתינות לתרגום מלא</p>
                </div>`
    ],
    'PendingApprovals.tsx': [
        `<div className="bg-white/5 border-b border-white/10 backdrop-blur-xl p-4 text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <CheckCircle size={20} /> ממתינים לאישור
                    </h3>
                </div>`,
        `<div className="p-6 border-b border-white/10 flex flex-col items-center justify-center text-center h-36 bg-white/5 relative group-hover:bg-white/10 transition-colors">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20 mb-3 text-white">
                        <CheckCircle size={24} />
                    </div>
                    <h3 className="font-bold text-lg text-white">ממתינים לאישור</h3>
                    <p className="text-xs text-white/60 mt-1 line-clamp-1">הצעות הממתינות לאישור עורכים</p>
                </div>`
    ],
    'RecentAdditions.tsx': [
        `<div className="bg-white/5 border-b border-white/10 backdrop-blur-xl p-4 text-white">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <Clock size={20} /> נוספו לאחרונה
                </h3>
            </div>`,
        `<div className="p-6 border-b border-white/10 flex flex-col items-center justify-center text-center h-36 bg-white/5 relative group-hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20 mb-3 text-white">
                    <Clock size={24} />
                </div>
                <h3 className="font-bold text-lg text-white">נוספו לאחרונה</h3>
                <p className="text-xs text-white/60 mt-1 line-clamp-1">צפה בכל המילים החדשות</p>
            </div>`
    ],
    'WordOfTheDay.tsx': [
        `<div className="bg-white/5 border-b border-white/10 backdrop-blur-xl p-4 text-white flex justify-between items-center">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <span className="text-xl">☀️</span> המילה היומית
                </h3>
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">{new Date().toLocaleDateString('he-IL')}</span>
            </div>`,
        `<div className="p-6 border-b border-white/10 flex flex-col items-center justify-center text-center h-36 bg-white/5 relative group-hover:bg-white/10 transition-colors">
                <div className="absolute top-4 left-4 text-[10px] font-medium tracking-wide bg-white/10 px-2.5 py-1 rounded-full text-white/90 shadow-sm border border-white/5">
                    {new Date().toLocaleDateString('he-IL')}
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-3 text-white">
                    <span className="text-2xl drop-shadow-md">☀️</span>
                </div>
                <h3 className="font-bold text-lg text-white">המילה היומית</h3>
                <p className="text-xs text-white/60 mt-1 line-clamp-1">השפה והתרבות של יהודי הקווקז</p>
            </div>`
    ]
};

Object.entries(replacements).forEach(([file, [oldCode, newCode]]) => {
    const filePath = path.join(dir, file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');

        // Exact string replacement mapping
        if (content.includes(oldCode)) {
            content = content.replace(oldCode, newCode);
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Successfully updated ${file}`);
        } else {
            console.log(`Failed to find target block in ${file}`);
        }
    }
});
