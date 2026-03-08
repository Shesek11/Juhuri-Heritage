import React from 'react';
import { Scroll, Users, Globe, HeartHandshake } from 'lucide-react';

const stats = [
  { icon: Scroll, value: '5,000+', label: 'מילים במילון' },
  { icon: Users, value: '150+', label: 'תורמים פעילים' },
  { icon: Globe, value: '8', label: 'ניבים שונים' },
  { icon: HeartHandshake, value: '3,000+', label: 'חברי קהילה' },
];

const StatsSection: React.FC = () => {
  return (
    <section className="relative z-10 py-24 px-4 mt-8 bg-gradient-to-b from-transparent via-[#0d1424]/40 to-transparent">
      <div className="max-w-5xl mx-auto relative">
        <div className="absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
        <div className="absolute inset-x-10 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 py-10">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="flex flex-col items-center text-center group">
                <div className="mb-6 text-amber-500/60 group-hover:text-amber-400 transition-colors duration-300 group-hover:-translate-y-2 transform">
                  <Icon size={36} strokeWidth={1.5} />
                </div>
                <p className="text-4xl md:text-5xl font-light text-white mb-3 tracking-tight">{stat.value}</p>
                <p className="text-sm tracking-widest text-slate-400 uppercase font-medium">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
