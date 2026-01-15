import React, { useState, useEffect } from 'react';
import { marketplaceService, Vendor } from '../services/marketplaceService';
import { VendorMap } from './marketplace/VendorMap';
import { VendorCard } from './marketplace/VendorCard';
import { Search, MapPin, Plus, Store, Filter, ChefHat } from 'lucide-react';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { BecomeVendorWizard } from './marketplace/BecomeVendorWizard';
import { VendorDetailsModal } from './marketplace/VendorDetailsModal';

export const MarketplacePage: React.FC = () => {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
    const [isWizardOpen, setIsWizardOpen] = useState(false);

    const { isEnabled } = useFeatureFlag('marketplace_module');

    useEffect(() => {
        loadVendors();
        // Try to get location
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setUserLocation(loc);
                loadVendors(loc);
            },
            (err) => console.log('Location access denied', err)
        );
    }, []);

    const loadVendors = async (loc?: { lat: number; lng: number }) => {
        try {
            setLoading(true);
            const data = await marketplaceService.getVendors({
                lat: loc?.lat,
                lng: loc?.lng,
                search: searchQuery
            });
            setVendors(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        loadVendors(userLocation);
    };

    if (!isEnabled) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center min-h-[50vh]">
                <Store size={64} className="text-slate-300 mb-4" />
                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200">השוק מתבשל...</h2>
                <p className="text-slate-500 mt-2">פיצ'ר זה יהיה זמין בקרוב!</p>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-80px)] flex flex-col pt-4">
            {/* Header */}
            <div className="px-4 mb-4 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <span className="bg-gradient-to-r from-orange-500 to-red-500 text-transparent bg-clip-text">
                            Taste of the Caucasus
                        </span>
                        <ChefHat size={24} className="text-orange-500" />
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">שוק האוכל הג'והורי</p>
                </div>

                <button
                    onClick={() => setIsWizardOpen(true)}
                    className="bg-slate-900 dark:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-slate-900/20 hover:scale-105 transition-transform"
                >
                    <Plus size={16} /> מכור אוכל
                </button>
            </div>

            {/* Search Bar */}
            <div className="px-4 mb-4">
                <form onSubmit={handleSearch} className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="חפש מאכלים, בשלנים..."
                        className="w-full pl-4 pr-10 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                </form>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                {/* List View (Mobile: Conditional, Desktop: Side Panel) */}
                <div className={`
                    bg-slate-50 dark:bg-slate-900/50 
                    md:w-[400px] md:border-l border-slate-200 dark:border-slate-700
                    flex flex-col
                    ${viewMode === 'map' ? 'hidden md:flex' : 'flex-1'}
                `}>
                    <div className="p-4 flex justify-between items-center bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 shadow-sm z-10">
                        <span className="font-bold text-slate-700 dark:text-slate-200">{vendors.length} בשלנים באזור</span>
                        <button className="text-slate-400 hover:text-orange-500">
                            <Filter size={18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {loading ? (
                            <div className="text-center py-10 text-slate-400">טוען...</div>
                        ) : vendors.length === 0 ? (
                            <div className="text-center py-10 text-slate-400">לא נמצאו בשלנים באזור</div>
                        ) : (
                            vendors.map(vendor => (
                                <VendorCard
                                    key={vendor.id}
                                    vendor={vendor}
                                    onClick={() => setSelectedVendor(vendor)} // TODO: Open Details Modal
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Map View */}
                <div className={`flex-1 relative ${viewMode === 'list' ? 'hidden md:block' : 'block'}`}>
                    <VendorMap
                        vendors={vendors}
                        userLocation={userLocation}
                        onVendorClick={(v) => {
                            setSelectedVendor(v);
                            // On mobile, maybe switch to list or show bottom sheet?
                        }}
                    />

                    {/* View Toggle (Mobile Only) */}
                    <button
                        onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
                        className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-xl z-[400] font-bold text-sm flex items-center gap-2"
                    >
                        {viewMode === 'map' ? (
                            <>📋 רשימה</>
                        ) : (
                            <>🗺️ מפה</>
                        )}
                    </button>
                </div>
            </div>

            {/* TODO: Vendor Details Modal */}
            {/* Vendor Details Modal */}
            {selectedVendor && (
                <VendorDetailsModal
                    vendor={selectedVendor}
                    onClose={() => setSelectedVendor(null)}
                />
            )}


            <BecomeVendorWizard
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                onSuccess={() => loadVendors(userLocation)}
            />
        </div>
    );
};
