'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { marketplaceService, Vendor } from '../services/marketplaceService';
import { VendorMap } from './marketplace/VendorMap';
import { VendorCard } from './marketplace/VendorCard';
import { ShoppingCart } from './marketplace/ShoppingCart';
import { Search, MapPin, Plus, Store, Filter, ChefHat, ShoppingCart as CartIcon } from 'lucide-react';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { useTranslations } from 'next-intl';
import { BecomeVendorWizard } from './marketplace/BecomeVendorWizard';
import { VendorDetailsModal } from './marketplace/VendorDetailsModal';
import { NotificationBell } from './marketplace/NotificationBell';
import { SEOHead } from './seo/SEOHead';

export const MarketplacePage: React.FC = () => {
    const params = useParams();
    const routeSlug = params?.slug as string | undefined;
    const router = useRouter();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [cartCount, setCartCount] = useState(0);

    const { isEnabled } = useFeatureFlag('marketplace_module');
    const t = useTranslations('marketplace');
    const tc = useTranslations('common');

    useEffect(() => {
        loadVendors();
        loadCartCount();
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

    // Load vendor from URL slug
    useEffect(() => {
        if (routeSlug && !selectedVendor) {
            marketplaceService.getVendorBySlug(routeSlug)
                .then(vendor => setSelectedVendor(vendor))
                .catch(err => {
                    console.error('Failed to load vendor:', err);
                    router.replace('/marketplace');
                });
        }
    }, [routeSlug]);

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

    const loadCartCount = async () => {
        try {
            const cart = await marketplaceService.getCart();
            setCartCount(cart.length);
        } catch (err) {
            // User not logged in or cart is empty
            setCartCount(0);
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
                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200">{t('cookingUp')}</h2>
                <p className="text-slate-400 mt-2">{t('comingSoonFeature')}</p>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-80px)] flex flex-col pt-4">
            <SEOHead
                title="שוק קהילתי - Taste of the Caucasus"
                description="שוק האוכל הג'והורי - מצאו בשלנים ומאכלים קווקזיים אותנטיים באזורכם."
                canonicalPath="/marketplace"
            />
            {/* Header */}
            <div className="px-4 mb-4 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-100 flex items-center gap-2">
                        <span className="bg-gradient-to-r from-orange-500 to-red-500 text-transparent bg-clip-text">
                            Taste of the Caucasus
                        </span>
                        <ChefHat size={24} className="text-orange-500" />
                    </h1>
                    <p className="text-sm text-slate-400 font-medium">{t('foodMarket')}</p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Notifications */}
                    <NotificationBell />

                    {/* Shopping Cart Button */}
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="relative bg-white/10 text-slate-700 dark:text-slate-300 p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                    >
                        <CartIcon size={20} />
                        {cartCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                                {cartCount}
                            </span>
                        )}
                    </button>

                    {/* Become Vendor Button */}
                    <button
                        onClick={() => setIsWizardOpen(true)}
                        className="bg-slate-900 dark:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-slate-900/20 hover:scale-105 transition-transform"
                    >
                        <Plus size={16} /> {t('sellFood')}
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="px-4 mb-4">
                <form onSubmit={handleSearch} className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('searchVendors')}
                        className="w-full pe-4 ps-10 py-3 rounded-xl bg-[#0d1424]/60 backdrop-blur-xl border border-white/10 shadow-sm focus-visible:ring-2 focus-visible:ring-orange-500 outline-none"
                    />
                </form>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                {/* List View (Mobile: Conditional, Desktop: Side Panel) */}
                <div className={`
                    bg-white/5/50
                    md:w-[400px] md:border-e border-white/10
                    flex flex-col
                    ${viewMode === 'map' ? 'hidden md:flex' : 'flex-1'}
                `}>
                    <div className="p-4 flex justify-between items-center bg-[#0d1424]/60 backdrop-blur-xl border-b border-white/10 shadow-sm z-10">
                        <span className="font-bold text-slate-700 dark:text-slate-200">{vendors.length} {t('vendorsInArea')}</span>
                        <button className="text-slate-400 hover:text-orange-500">
                            <Filter size={18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {loading ? (
                            <div className="text-center py-10 text-slate-400">{tc('loading')}</div>
                        ) : vendors.length === 0 ? (
                            <div className="text-center py-10 text-slate-400">{t('noVendorsFound')}</div>
                        ) : (
                            vendors.map(vendor => (
                                <VendorCard
                                    key={vendor.id}
                                    vendor={vendor}
                                    onClick={() => {
                                        setSelectedVendor(vendor);
                                        router.push(`/marketplace/${vendor.slug}`);
                                    }}
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
                            router.push(`/marketplace/${v.slug}`);
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

            {/* Vendor Details Modal */}
            {selectedVendor && (
                <VendorDetailsModal
                    vendor={selectedVendor}
                    onClose={() => {
                        setSelectedVendor(null);
                        router.push('/marketplace');
                    }}
                    onCartUpdated={loadCartCount}
                />
            )}

            {/* Shopping Cart */}
            <ShoppingCart
                isOpen={isCartOpen}
                onClose={() => {
                    setIsCartOpen(false);
                    loadCartCount();
                }}
            />

            {/* Become Vendor Wizard */}
            <BecomeVendorWizard
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                onSuccess={() => loadVendors(userLocation)}
            />
        </div>
    );
};
