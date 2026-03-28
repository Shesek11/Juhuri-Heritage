'use client';
import { Database } from 'lucide-react';
import AdminDuplicatesPanel from '../../../../../../components/admin/AdminDuplicatesPanel';

export default function AdminDuplicatesPage() {
  return (
    <div className="flex-1 flex flex-col w-full">
      <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
        <Database size={24} className="text-amber-500" />
        ניהול כפילויות
      </h2>
      <AdminDuplicatesPanel />
    </div>
  );
}
