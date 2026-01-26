import React from 'react';
import { Vendor } from '../../services/marketplaceService';
import { MapPin, Phone, Star, Clock, CheckCircle } from 'lucide-react';
import { getVendorStatus } from '../../utils/marketplaceHelpers';

interface VendorCardProps {
    vendor: Vendor;
    onClick: () => void;
}

export const VendorCard: React.FC<VendorCardProps> = ({ vendor, onClick }) => {
    const status = getVendorStatus(vendor);
    const isOpen = status.isOpen;

    return (
        <div
            onClick={onClick}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden border border-slate-100 dark:border-slate-700 group"
        >
            <div className="h-40 bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
                {vendor.logo_url || vendor.about_image_url ? (
                    <img
                        src={vendor.logo_url || vendor.about_image_url}
                        alt={vendor.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <span className="text-4xl">🏪</span>
                    </div>
                )}

                <div className="absolute top-2 right-2 flex gap-2">
                    <span
                        className={`px-2 py-1 rounded-lg text-xs font-bold text-white shadow-sm ${
                            isOpen ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        title={status.message}
                    >
                        {isOpen ? 'פעיל' : 'לא פעיל'}
                    </span>
                    {vendor.is_verified && (
                        <span className="px-2 py-1 rounded-lg text-xs font-bold bg-blue-500 text-white backdrop-blur-sm shadow-sm flex items-center gap-1">
                            <CheckCircle size={12} />
                            מאומת
                        </span>
                    )}
                    {vendor.distance_km !== undefined && (
                        <span className="px-2 py-1 rounded-lg text-xs font-bold bg-black/60 text-white backdrop-blur-sm shadow-sm flex items-center gap-1">
                            <MapPin size={12} />
                            {vendor.distance_km.toFixed(1)} ק"מ
                        </span>
                    )}
                </div>
            </div>

            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 leading-tight">
                            {vendor.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                            {vendor.address}
                        </p>
                    </div>
                    {vendor.avg_rating && Number(vendor.avg_rating) > 0 && (
                        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded text-amber-600 dark:text-amber-400 text-xs font-bold">
                            <Star size={12} fill="currentColor" />
                            {Number(vendor.avg_rating).toFixed(1)}
                        </div>
                    )}
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-3 h-10">
                    {vendor.about_text || 'אוכל עדתי מסורתי'}
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        {vendor.owner_name ? (
                            <>
                                <img
                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(vendor.owner_name)}`}
                                    alt={vendor.owner_name}
                                    className="w-6 h-6 rounded-full"
                                />
                                <span className="text-xs text-slate-500 dark:text-slate-400">{vendor.owner_name}</span>
                            </>
                        ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500">דיווח קהילתי</span>
                        )}
                    </div>
                    {vendor.review_count !== undefined && vendor.review_count > 0 && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                            {vendor.review_count} ביקורות
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
