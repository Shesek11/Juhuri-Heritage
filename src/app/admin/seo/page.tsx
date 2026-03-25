'use client';
import { Globe } from 'lucide-react';
import AdminSEOPanel from '../../../../components/admin/AdminSEOPanel';

export default function AdminSEOPage() {
  return (
    <div className="flex-1 flex flex-col w-full">
      <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
        <Globe size={24} className="text-green-500" />
        ניהול SEO
      </h2>
      <AdminSEOPanel />
    </div>
  );
}
