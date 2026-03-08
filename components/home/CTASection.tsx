// CTASection - Call to action for joining the community

interface CTASectionProps {
  onOpenAuthModal: (reason?: string) => void;
}

function CTASection({ onOpenAuthModal }: CTASectionProps) {
  return (
    <section className="relative z-10 py-32 px-4 text-center overflow-hidden">
      <div className="max-w-3xl mx-auto relative z-20">
        <div className="absolute inset-0 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />
        <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">הצטרפו למעגל השומרים</h2>
        <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
          תרמו מהידע שלכם, שתפו מילים מהבית, בניית עץ משפחה ומסורת ארוכת שנים. יחד נשמר את שפת הג׳והורי חיה ופועמת.
        </p>
        <button
          onClick={() => onOpenAuthModal('join_community')}
          className="px-12 py-5 bg-[#0d1424] border border-amber-500/50 text-amber-400 font-bold rounded-full overflow-hidden relative group hover:text-[#050B14] transition-all duration-500 shadow-[0_0_30px_rgba(245,158,11,0.15)] hover:shadow-[0_0_40px_rgba(245,158,11,0.3)] hover:scale-105"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-in-out z-0" />
          <span className="relative z-10 text-xl font-medium tracking-wide">כניסה לקהילה</span>
        </button>
      </div>
    </section>
  );
};

export default CTASection;
