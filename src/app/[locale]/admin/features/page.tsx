'use client';
import { ToggleLeft } from 'lucide-react';
import FeatureFlagsPanel from '../../../../../components/admin/FeatureFlagsPanel';

export default function AdminFeaturesPage() {
  return (
    <div className="flex-1 flex flex-col w-full">
      <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
        <ToggleLeft size={24} className="text-purple-500" />
        ניהול פיצ'רים
      </h2>
      <FeatureFlagsPanel />
    </div>
  );
}
