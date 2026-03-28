// CTASection - Call to action for joining the community
import { useTranslations } from 'next-intl';

interface CTASectionProps {
  onOpenAuthModal: (reason?: string) => void;
}

function CTASection({ onOpenAuthModal }: CTASectionProps) {
  const t = useTranslations('home');
  return (
    <section className="relative z-10 py-32 px-4 text-center overflow-hidden">
      <div className="max-w-3xl mx-auto relative z-20">
        <div className="absolute inset-0 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />
        <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">{t('ctaTitle')}</h2>
        <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
          {t('ctaDescription')}
        </p>
        <button
          onClick={() => onOpenAuthModal(t('ctaAuthReason'))}
          className="px-12 py-5 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-600 text-white font-bold rounded-full relative group transition-all duration-500 shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:shadow-[0_0_50px_rgba(245,158,11,0.6)] hover:scale-105"
        >
          <span className="relative z-10 text-xl font-black tracking-wide">{t('ctaButton')}</span>
        </button>
      </div>
    </section>
  );
};

export default CTASection;
