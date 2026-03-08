import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroSection from './home/HeroSection';
import FeaturesSection from './home/FeaturesSection';
import StatsSection from './home/StatsSection';
import CTASection from './home/CTASection';

interface HomePageProps {
  featureFlags: Record<string, string>;
  onOpenAuthModal: (reason?: string) => void;
  isAdmin: boolean;
}

const HomePage: React.FC<HomePageProps> = ({ featureFlags, onOpenAuthModal, isAdmin }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/dictionary?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <div className="w-full bg-[#050B14] min-h-screen text-slate-200 selection:bg-amber-500/30">
      {/* Background with Buta Pattern Overlay */}
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-juhuri-pattern"
        style={{
          transform: `translateY(${scrollY * 0.1}px)`
        }}
      />

      {/* Subtle Glow Effects */}
      <div className="fixed top-0 left-[-10%] sm:left-1/4 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-amber-600/10 rounded-full blur-[100px] sm:blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-[-10%] sm:right-1/4 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-blue-900/20 rounded-full blur-[100px] sm:blur-[150px] pointer-events-none" />

      <HeroSection
        scrollY={scrollY}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        handleSearch={handleSearch}
      />
      <FeaturesSection featureFlags={featureFlags} isAdmin={isAdmin} />
      <StatsSection />
      <CTASection onOpenAuthModal={onOpenAuthModal} />
    </div>
  );
};

export default HomePage;
