import React from 'react';
import { Search, Sparkles } from 'lucide-react';

interface HeroSectionProps {
  scrollY: number;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  handleSearch: (e: React.FormEvent) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ scrollY, searchTerm, setSearchTerm, handleSearch }) => {
  return (
    <section className="relative z-10 min-h-[100vh] flex flex-col items-center justify-end overflow-hidden">

      {/* Mountain Background Image */}
      <div
        className="absolute inset-0 z-0"
        style={{ transform: `translateY(${scrollY * 0.25}px)` }}
      >
        <img
          src="/images/caucasus-bg.jpg"
          alt="הרי הקווקז"
          className="w-full h-[120%] object-cover object-center"
        />
        {/* Color overlay for mood */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050B14]/70 via-[#050B14]/30 to-[#050B14]/90" />
        {/* Warm sunset tint */}
        <div className="absolute inset-0 bg-gradient-to-t from-amber-900/20 via-transparent to-purple-900/15 mix-blend-soft-light" />
      </div>

      {/* Decorative Caucasian Rug Geometric Border — Top */}
      <div className="absolute top-0 left-0 right-0 z-20 h-16 flex items-center justify-center overflow-hidden opacity-40">
        <div className="flex gap-0 w-full">
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={`top-${i}`} className="flex-shrink-0 w-8 h-8 border border-amber-500/40 rotate-45 -mx-2 mt-4" />
          ))}
        </div>
      </div>

      {/* Giant Title Text — Behind the foreground, creates layering effect */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none" style={{ transform: `translateY(${scrollY * -0.15}px)` }}>
        <h1 className="text-[6rem] sm:text-[9rem] md:text-[14rem] lg:text-[18rem] font-black text-white/[0.08] tracking-tighter leading-none select-none whitespace-nowrap" style={{ fontFamily: "'Rubik', sans-serif" }}>
          ג׳והורי
        </h1>
      </div>

      {/* Foreground gradient — imitates "rocks/ground" layer for depth */}
      <div className="absolute bottom-0 left-0 right-0 z-20 h-[50vh] bg-gradient-to-t from-[#050B14] via-[#050B14]/80 to-transparent pointer-events-none" />

      {/* Side decorative elements — Pomegranate/vine motif */}
      <div className="absolute left-2 sm:left-6 top-1/3 z-20 opacity-30 hidden sm:block" style={{ transform: `translateY(${scrollY * 0.1}px)` }}>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={`left-${i}`} className="w-3 h-3 rounded-full border-2 border-amber-500/60" />
          ))}
          <div className="w-[2px] h-20 bg-gradient-to-b from-amber-500/40 to-transparent mx-auto" />
        </div>
      </div>
      <div className="absolute right-2 sm:right-6 top-1/3 z-20 opacity-30 hidden sm:block" style={{ transform: `translateY(${scrollY * 0.1}px)` }}>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={`right-${i}`} className="w-3 h-3 rounded-full border-2 border-amber-500/60" />
          ))}
          <div className="w-[2px] h-20 bg-gradient-to-b from-amber-500/40 to-transparent mx-auto" />
        </div>
      </div>

      {/* Main Hero Content — sits in front of everything */}
      <div className="relative z-30 w-full max-w-3xl mx-auto flex flex-col items-center text-center px-4 pb-16 sm:pb-24 space-y-6 animate-hero-fade-in">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#050B14]/50 border border-amber-500/30 text-amber-300 text-sm font-medium backdrop-blur-xl shadow-xl">
          <Sparkles size={16} />
          <span>הבית של יהדות קווקז ברשת</span>
        </div>

        {/* Title */}
        <h1 className="text-5xl sm:text-6xl md:text-8xl font-black text-white tracking-tight leading-[1.05] drop-shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          מורשת{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-l from-amber-200 via-amber-400 to-yellow-500">
            ג׳והורי
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl md:text-2xl text-slate-200/90 max-w-xl font-light leading-relaxed drop-shadow-lg">
          שימור השפה, התרבות והמסורת של יהודי ההרים
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="w-full max-w-xl pt-2">
          <div className="relative group mx-auto">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/50 to-yellow-600/50 rounded-[2rem] blur-md opacity-40 group-hover:opacity-70 transition duration-500"></div>
            <div className="relative flex items-center bg-[#050B14]/70 border border-white/10 hover:border-amber-500/40 rounded-[2rem] p-2 pl-4 pr-2 transition-all duration-300 shadow-2xl backdrop-blur-2xl">
              <input
                type="text"
                placeholder="חפשו במילון המורשת..."
                className="w-full bg-transparent text-white placeholder-slate-400 border-none outline-none text-lg sm:text-xl px-4 h-12"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button
                type="submit"
                aria-label="חיפוש במילון"
                title="חיפוש במילון"
                className="flex items-center justify-center min-w-[3.5rem] w-14 h-14 bg-gradient-to-br from-amber-400 to-yellow-600 text-[#050B14] rounded-3xl hover:scale-105 transition-transform duration-300 shadow-lg"
              >
                <Search size={24} className="stroke-[2.5]" />
              </button>
            </div>
          </div>
        </form>

        {/* Scroll indicator */}
        <div className="pt-6 animate-bounce opacity-50">
          <div className="w-[1px] h-12 bg-gradient-to-b from-amber-400/60 to-transparent mx-auto" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
