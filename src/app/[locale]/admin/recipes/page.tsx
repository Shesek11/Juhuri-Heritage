'use client';
import { Tag } from 'lucide-react';
import AdminTagsPanel from '../../../../../components/admin/AdminTagsPanel';

export default function AdminRecipesPage() {
  return (
    <div className="flex-1 flex flex-col w-full">
      <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
        <Tag size={24} className="text-amber-500" />
        ניהול תגיות
      </h2>
      <AdminTagsPanel />
    </div>
  );
}
