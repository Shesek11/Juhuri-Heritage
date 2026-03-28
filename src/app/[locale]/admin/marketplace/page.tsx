'use client';
import { ShoppingCart } from 'lucide-react';
import AdminMarketplacePanel from '../../../../../components/admin/AdminMarketplacePanel';

export default function AdminMarketplacePage() {
  return (
    <div className="flex-1 flex flex-col w-full">
      <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
        <ShoppingCart size={24} className="text-emerald-500" />
        ניהול חנויות
      </h2>
      <AdminMarketplacePanel />
    </div>
  );
}
