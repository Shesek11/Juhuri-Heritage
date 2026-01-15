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
        <div className="relative w-full min-h-[40dvh] flex flex-col items-center justify-start pt-24 overflow-hidden font-rubik">

            {/* --- PARALLAX BACKGROUND LAYERS --- */}

            {/* Layer 0: Deep Sky Gradient (Fixed/Slow) */}
            <div
                className="absolute inset-0 z-0 bg-gradient-to-b from-slate-900 via-emerald-950 to-teal-900"
                style={{ transform: `translateY(${scrollY * 0.1}px)` }}
            ></div>

            {/* Layer 1: Stars (Very Slow) */}
            <div className="absolute inset-0 z-0" style={{ transform: `translateY(${scrollY * 0.05}px)` }}>
                <div className="absolute top-[10%] left-[15%] w-1 h-1 bg-white rounded-full opacity-60 animate-pulse"></div>
                <div className="absolute top-[8%] left-[45%] w-1.5 h-1.5 bg-white rounded-full opacity-40 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                <div className="absolute top-[15%] left-[75%] w-1 h-1 bg-white rounded-full opacity-50 animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-[5%] left-[85%] w-1 h-1 bg-amber-200 rounded-full opacity-60"></div>
                {/* Moon */}
                <div className="absolute top-[8%] right-[12%] w-16 h-16 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full shadow-[0_0_50px_rgba(251,191,36,0.3)] opacity-90"></div>
            </div>

            {/* Layer 2: Distant Mountains (Slow) */}
            <div
                className="absolute inset-x-0 bottom-0 z-0 h-[600px] text-emerald-900/40 pointer-events-none"
                style={{ transform: `translateY(${scrollY * 0.2}px)` }}
            >
                <svg viewBox="0 0 1440 320" className="w-full h-full" preserveAspectRatio="none">
                    <path fill="currentColor" d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,128C960,139,1056,181,1152,197.3C1248,213,1344,203,1392,197.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                </svg>
            </div>

            {/* Layer 3: Middle Hills (Medium Speed) */}
            <div
                className="absolute inset-x-0 bottom-0 z-0 h-[500px] text-teal-900/60 pointer-events-none"
                style={{ transform: `translateY(${scrollY * 0.3}px)` }}
            >
                <svg viewBox="0 0 1440 320" className="w-full h-full" preserveAspectRatio="none">
                    <path fill="currentColor" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,250.7C960,235,1056,181,1152,160C1248,139,1344,149,1392,154.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                </svg>
            </div>

            {/* Layer 4: Foreground Terrain (Fastest - Front) */}
            <div
                className="absolute inset-x-0 bottom-0 z-0 h-[400px] text-teal-950/80 pointer-events-none"
                style={{ transform: `translateY(${scrollY * 0.4}px)` }}
            >
                <svg viewBox="0 0 1440 320" className="w-full h-full" preserveAspectRatio="none">
                    <path fill="currentColor" d="M0,96L48,112C96,128,192,160,288,186.7C384,213,480,235,576,213.3C672,192,768,128,864,128C960,128,1056,192,1152,208C1248,224,1344,192,1392,176L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                </svg>
            </div>

            {/* Mist Overlay at bottom to blend content */}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-slate-50 dark:from-slate-900 to-transparent z-10" />


            {/* --- MAIN CONTENT (Scrolls normally, sits on top) --- */}
            <div className="relative z-20 w-full max-w-4xl px-4 flex flex-col items-center text-center space-y-6 mt-10">

                {/* Title Area */}
                <div className="space-y-4 animate-in fade-in slide-in-from-top-8 duration-700">
                    <h1 className="text-5xl md:text-7xl font-bold text-white drop-shadow-2xl tracking-tight">
                        מילון ג׳והורי
                    </h1>
                    <p className="text-xl md:text-2xl text-emerald-100 max-w-2xl mx-auto font-light drop-shadow-lg">
                        משמרים את השפה, המורשת והתרבות של יהודי הקווקז
                    </p>
                </div>

                {/* Search Bar Container */}
                <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                    {children}
                </div>

            </div>

            {/* Bottom Section - Grandmother Tributes & Important Text */}
            {showBottomContent && (
                <div className="relative z-20 w-full max-w-5xl px-4 mt-16 mb-24 pb-20">

                    {/* Desktop: 3-column layout (grandma | text | grandma). Mobile: text first, then grandmas row */}
                    <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-center justify-items-center gap-6 md:gap-8">

                        {/* Grandma 1 - LEFT on desktop, hidden on mobile */}
                        <div className="hidden md:block relative group w-28 h-36 md:w-32 md:h-40 transform -rotate-3 hover:rotate-0 transition-all duration-500 flex-shrink-0">
                            {/* Placeholder Photo */}
                            <div className="absolute inset-3 overflow-hidden rounded-[45%] z-0 bg-teal-100">
                                <img src="/images/grandma1.jpg" alt="Mountain Jewish Grandmother" className="w-full h-full object-cover opacity-90 sepia-[.3] hover:sepia-0 transition-all duration-500" />
                            </div>
                            {/* Vintage Frame Border - Gold/Amber aligns with Green */}
                            <div className="absolute inset-0 rounded-[45%] border-4 border-amber-500/60 shadow-lg z-10 pointer-events-none" style={{
                                boxShadow: '0 0 0 3px rgba(180,130,70,0.2), 0 4px 20px rgba(0,0,0,0.3), inset 0 0 10px rgba(180,130,70,0.1)'
                            }}></div>
                        </div>

                        {/* Important Text Block - CENTER */}
                        <div className="text-center max-w-lg animate-in fade-in duration-1000 delay-300">
                            <div className="inline-flex justify-center items-center p-3 bg-teal-900/30 backdrop-blur-sm rounded-full mb-4 text-amber-400 border border-teal-500/20">
                                <HeartHandshake size={28} />
                            </div>
                            <h2 className="text-xl md:text-2xl font-bold text-white mb-3 drop-shadow-md">
                                המילון שיאפשר לך לדבר עם סבתא
                            </h2>
                            <p className="text-sm md:text-base text-teal-50/90 leading-relaxed drop-shadow-sm font-medium">
                                השפה שלנו היא הזיכרון שלנו. הקלידו מילה או השתמשו בהקלטה כדי לגלות את העושר של השפה הג'והורית, לשמר את הניבים השונים ולהתחבר מחדש למסורת.
                            </p>
                            {dialects.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2 justify-center text-xs text-teal-200/80">
                                    {dialects.map(d => (
                                        <span key={d.id} className="px-2 py-1 bg-teal-950/40 rounded-full border border-teal-500/30">• {d.description?.split(' ')[0]}</span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Grandma 2 - RIGHT on desktop, hidden on mobile */}
                        <div className="hidden md:block relative group w-28 h-36 md:w-32 md:h-40 transform rotate-3 hover:rotate-0 transition-all duration-500 flex-shrink-0">
                            {/* Placeholder Photo */}
                            <div className="absolute inset-3 overflow-hidden rounded-[45%] z-0 bg-teal-100">
                                <img src="/images/grandma2.jpg" alt="Mountain Jewish Grandmother" className="w-full h-full object-cover opacity-90 sepia-[.3] hover:sepia-0 transition-all duration-500" />
                            </div>
                            {/* Vintage Frame Border */}
                            <div className="absolute inset-0 rounded-[45%] border-4 border-amber-500/60 shadow-lg z-10 pointer-events-none" style={{
                                boxShadow: '0 0 0 3px rgba(180,130,70,0.2), 0 4px 20px rgba(0,0,0,0.3), inset 0 0 10px rgba(180,130,70,0.1)'
                            }}></div>
                        </div>

                        {/* Mobile: Both grandmas in a row BELOW text */}
                        <div className="md:hidden col-span-1 flex flex-row justify-center items-center gap-6">
                            {/* Grandma 1 Mobile */}
                            <div className="relative group w-24 h-32 transform -rotate-3 hover:rotate-0 transition-all duration-500 flex-shrink-0">
                                <div className="absolute inset-2 overflow-hidden rounded-[45%] z-0 bg-teal-100">
                                    <img src="/images/grandma1.jpg" alt="Mountain Jewish Grandmother" className="w-full h-full object-cover opacity-90 sepia-[.3] hover:sepia-0 transition-all duration-500" />
                                </div>
                                <div className="absolute inset-0 rounded-[45%] border-4 border-amber-500/60 shadow-lg z-10 pointer-events-none" style={{
                                    boxShadow: '0 0 0 3px rgba(180,130,70,0.2), 0 4px 20px rgba(0,0,0,0.3), inset 0 0 10px rgba(180,130,70,0.1)'
                                }}></div>
                            </div>
                            {/* Grandma 2 Mobile */}
                            <div className="relative group w-24 h-32 transform rotate-3 hover:rotate-0 transition-all duration-500 flex-shrink-0">
                                <div className="absolute inset-2 overflow-hidden rounded-[45%] z-0 bg-teal-100">
                                    <img src="/images/grandma2.jpg" alt="Mountain Jewish Grandmother" className="w-full h-full object-cover opacity-90 sepia-[.3] hover:sepia-0 transition-all duration-500" />
                                </div>
                                <div className="absolute inset-0 rounded-[45%] border-4 border-amber-500/60 shadow-lg z-10 pointer-events-none" style={{
                                    boxShadow: '0 0 0 3px rgba(180,130,70,0.2), 0 4px 20px rgba(0,0,0,0.3), inset 0 0 10px rgba(180,130,70,0.1)'
                                }}></div>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default HeroSection;
