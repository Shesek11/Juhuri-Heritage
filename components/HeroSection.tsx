import React, { useEffect, useState } from 'react';
import { HeartHandshake } from 'lucide-react';

interface HeroSectionProps {
    children: React.ReactNode;
    dialects?: { id: string; description?: string }[];
    showBottomContent?: boolean;
}

const HeroSection: React.FC<HeroSectionProps> = ({ children, dialects = [], showBottomContent = true }) => {
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            setScrollY(window.scrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="relative w-full min-h-[40dvh] flex flex-col items-center justify-start pt-24 pb-8 overflow-hidden font-rubik">

            {/* --- PREMIUM BACKGROUND LAYERS --- */}
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none bg-juhuri-pattern"
                style={{ transform: `translateY(${scrollY * 0.1}px)` }}
            />

            {/* Subtle Glow Effects */}
            <div className="absolute top-[-10%] sm:top-[-20%] left-[-10%] w-[300px] h-[300px] bg-amber-600/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute top-1/4 right-[-10%] w-[400px] h-[400px] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none" />

            {/* Mist Overlay at bottom to blend content */}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#050B14]/80 to-transparent z-10 pointer-events-none" />

            {/* --- MAIN CONTENT --- */}
            <div className="relative z-20 w-full max-w-4xl px-4 flex flex-col items-center text-center space-y-6 mt-10">

                {/* Title Area */}
                <div className="space-y-4 animate-in fade-in slide-in-from-top-8 duration-700">
                    <h1 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-300 drop-shadow-2xl tracking-tight leading-normal">
                        מילון ג׳והורי
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-300 max-w-2xl mx-auto font-light drop-shadow-lg">
                        משמרים את השפה, המורשת והתרבות של יהודי הקווקז
                    </p>
                </div>

                {/* Search Bar Container */}
                <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 relative z-30">
                    {children}
                </div>

            </div>

            {/* Bottom Section - Tributes & Dialects */}
            {showBottomContent && (
                <div className="relative z-20 w-full max-w-5xl px-4 mt-16 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-center justify-items-center gap-6 md:gap-8 bg-[#0d1424]/40 border border-white/5 rounded-3xl p-6 md:p-10 backdrop-blur-md shadow-2xl">

                        {/* Grandma 1 - Desktop */}
                        <div className="hidden md:block relative group w-28 h-36 md:w-32 md:h-40 transform -rotate-3 hover:rotate-0 transition-all duration-500 flex-shrink-0">
                            <div className="absolute inset-3 overflow-hidden rounded-[45%] z-0 bg-amber-900/20">
                                <img src="/images/grandma1.jpg" alt="Mountain Jewish Grandmother" className="w-full h-full object-cover opacity-80 mix-blend-luminosity hover:mix-blend-normal transition-all duration-500" />
                            </div>
                            <div className="absolute inset-0 rounded-[45%] border border-amber-500/30 shadow-lg z-10 pointer-events-none shadow-[inset_0_0_20px_rgba(245,158,11,0.2)]"></div>
                        </div>

                        {/* Important Text Block - CENTER */}
                        <div className="text-center max-w-lg animate-in fade-in duration-1000 delay-300">
                            <div className="inline-flex justify-center items-center p-3 bg-amber-500/10 backdrop-blur-sm rounded-full mb-4 text-amber-400 border border-amber-500/20 relative shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                                <HeartHandshake size={28} />
                            </div>
                            <h2 className="text-xl md:text-2xl font-bold text-white mb-3 drop-shadow-md">
                                המילון שיאפשר לך לדבר עם סבתא
                            </h2>
                            <p className="text-sm md:text-base text-slate-300 leading-relaxed font-light">
                                השפה שלנו היא הזיכרון שלנו. הקלידו מילה או השתמשו בהקלטה כדי לגלות את העושר של השפה הג'והורית, לשמר את הניבים השונים ולהתחבר מחדש למסורת.
                            </p>
                            {dialects.length > 0 && (
                                <div className="mt-6 flex flex-wrap gap-2 justify-center text-xs text-amber-200/80">
                                    {dialects.map(d => (
                                        <span key={d.id} className="px-3 py-1 bg-amber-950/40 rounded-full border border-amber-500/20 shadow-sm">• {d.description?.split(' ')[0]}</span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Grandma 2 - Desktop */}
                        <div className="hidden md:block relative group w-28 h-36 md:w-32 md:h-40 transform rotate-3 hover:rotate-0 transition-all duration-500 flex-shrink-0">
                            <div className="absolute inset-3 overflow-hidden rounded-[45%] z-0 bg-amber-900/20">
                                <img src="/images/grandma2.jpg" alt="Mountain Jewish Grandmother" className="w-full h-full object-cover opacity-80 mix-blend-luminosity hover:mix-blend-normal transition-all duration-500" />
                            </div>
                            <div className="absolute inset-0 rounded-[45%] border border-amber-500/30 shadow-lg z-10 pointer-events-none shadow-[inset_0_0_20px_rgba(245,158,11,0.2)]"></div>
                        </div>

                        {/* Mobile: Grandmas */}
                        <div className="md:hidden col-span-1 flex flex-row justify-center items-center gap-6 mt-4">
                            <div className="relative group w-20 h-28 transform -rotate-3 hover:rotate-0 transition-all duration-500 flex-shrink-0">
                                <div className="absolute inset-2 overflow-hidden rounded-[45%] z-0 bg-amber-900/20">
                                    <img src="/images/grandma1.jpg" alt="Mountain Jewish Grandmother" className="w-full h-full object-cover opacity-80 mix-blend-luminosity hover:mix-blend-normal transition-all duration-500" />
                                </div>
                                <div className="absolute inset-0 rounded-[45%] border border-amber-500/30 shadow-lg z-10 pointer-events-none"></div>
                            </div>
                            <div className="relative group w-20 h-28 transform rotate-3 hover:rotate-0 transition-all duration-500 flex-shrink-0">
                                <div className="absolute inset-2 overflow-hidden rounded-[45%] z-0 bg-amber-900/20">
                                    <img src="/images/grandma2.jpg" alt="Mountain Jewish Grandmother" className="w-full h-full object-cover opacity-80 mix-blend-luminosity hover:mix-blend-normal transition-all duration-500" />
                                </div>
                                <div className="absolute inset-0 rounded-[45%] border border-amber-500/30 shadow-lg z-10 pointer-events-none"></div>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default HeroSection;
