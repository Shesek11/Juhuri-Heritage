'use client';
import { KeyRound } from 'lucide-react';
import ApiSettingsPanel from '../../../../components/admin/ApiSettingsPanel';

export default function AdminSettingsPage() {
  return (
    <div className="flex-1 flex flex-col w-full">
      <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
        <KeyRound size={24} className="text-purple-500" />
        מפתחות API
      </h2>
      <ApiSettingsPanel />
    </div>
  );
}
