'use client';
import { Activity } from 'lucide-react';
import AdminAnalyticsPanel from '../../../../../components/admin/AdminAnalyticsPanel';

export default function AdminAnalyticsPage() {
  return (
    <div className="flex-1 flex flex-col w-full">
      <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
        <Activity size={24} className="text-amber-500" />
        Google Analytics
      </h2>
      <AdminAnalyticsPanel />
    </div>
  );
}
