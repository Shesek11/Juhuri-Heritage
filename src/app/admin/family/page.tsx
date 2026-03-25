'use client';
import { GitBranch } from 'lucide-react';
import AdminFamilyPanel from '../../../../components/admin/AdminFamilyPanel';

export default function AdminFamilyPage() {
  return (
    <div className="flex-1 flex flex-col w-full">
      <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
        <GitBranch size={24} className="text-cyan-500" />
        הצעות ובקשות - אילן יוחסין
      </h2>
      <AdminFamilyPanel />
    </div>
  );
}
