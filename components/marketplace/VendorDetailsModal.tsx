import React, { useState, useEffect } from 'react';
import { Vendor, MenuItem, Review, VendorUpdate, marketplaceService } from '../../services/marketplaceService';
import { X, MapPin, Phone, Star, Clock, ShoppingBag, Loader2, Utensils, Mail, Globe, CheckCircle, Plus, MessageCircle, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getVendorStatus } from '../../utils/marketplaceHelpers';
import { SEOHead, buildLocalBusinessJsonLd } from '../seo/SEOHead';

interface VendorDetailsModalProps {
    vendor: Vendor;
    onClose: () => void;
    onCartUpdated?: () => void;
}

export const VendorDetailsModal: React.FC<VendorDetailsModalProps> = ({ vendor: initialVendor, onClose, onCartUpdated }) => {
    const { user } = useAuth();
    const [vendor, setVendor] = useState<Vendor>(initialVendor);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'menu' | 'reviews' | 'hours' | 'updates'>('menu');
    const [addingToCart, setAddingToCart] = useState<number | null>(null);

    // Review state
    const [reviews, setReviews] = useState<Review[]>([]);
    const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
    const [submittingReview, setSubmittingReview] = useState(false);

    useEffect(() => {
        loadVendorDetails();
    }, [initialVendor.slug]);

    const loadVendorDetails = async () => {
        setLoading(true);
        try {
            const data = await marketplaceService.getVendorBySlug(initialVendor.slug);
            setVendor(data);

            // Load reviews
            if (data.id) {
                const reviewsData = await marketplaceService.getReviews(data.id);
                setReviews(reviewsData);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = async (menuItem: MenuItem) => {
        if (!user) {
            alert('יש להתחבר כדי להוסיף לסל');
            return;
        }

        setAddingToCart(menuItem.id);
        try {
            await marketplaceService.addToCart({
                menu_item_id: menuItem.id,
                quantity: 1
            });
            alert('✅ נוסף לסל בהצלחה!');
            onCartUpdated?.();
        } catch (err) {
            console.error('Failed to add to cart:', err);
            alert('שגיאה בהוספה לסל');
        } finally {
            setAddingToCart(null);
        }
    };

    const submitReview = async () => {
        if (!user) {
            alert('יש להתחבר כדי לכתוב ביקורת');
            return;
        }

        if (!newReview.comment.trim()) {
            alert('אנא כתוב תגובה');
            return;
        }

        setSubmittingReview(true);
        try {
            await marketplaceService.submitReview(vendor.id, newReview);
            alert('✅ הביקורת נשלחה בהצלחה!');
            setNewReview({ rating: 5, comment: '' });

            // Reload reviews
            const reviewsData = await marketplaceService.getReviews(vendor.id);
            setReviews(reviewsData);
        } catch (err) {
            console.error('Failed to submit review:', err);
            alert('שגיאה בשליחת הביקורת');
        } finally {
            setSubmittingReview(false);
        }
    };

    const getDayName = (dayIndex: number): string => {
        const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
        return days[dayIndex] || '';
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
            <SEOHead
                title={`${vendor.name} - שוק`}
                description={vendor.about_text || `${vendor.name} בשוק הקהילתי הג'והורי`}
                canonicalPath={`/marketplace/${vendor.slug}`}
                jsonLd={buildLocalBusinessJsonLd({
                    name: vendor.name,
                    about_text: vendor.about_text,
                    address: vendor.address,
                    city: vendor.city,
                    latitude: vendor.latitude,
                    longitude: vendor.longitude,
                    phone: vendor.phone,
                    website: vendor.website,
                    avg_rating: vendor.avg_rating,
                    review_count: vendor.review_count,
                })}
            />
            <div className="bg-[#0d1424]/60 backdrop-blur-xl w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex overflow-hidden lg:flex-row flex-col" onClick={e => e.stopPropagation()}>

                {/* Left Side: Cover & Info */}
                <div className="w-full lg:w-1/3 bg-slate-50 dark:bg-slate-950 flex flex-col border-e border-slate-200 dark:border-slate-800">
                    <div className="h-48 lg:h-64 relative">
                        {vendor.logo_url || vendor.about_image_url ? (
                            <img
                                src={vendor.logo_url || vendor.about_image_url}
                                alt={vendor.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-white/10 flex items-center justify-center text-4xl">
                                🏪
                            </div>
                        )}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto">
                        <h2 className="text-2xl font-bold text-amber-500 mb-2">{vendor.name}</h2>

                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                            {(() => {
                                const status = getVendorStatus(vendor);
                                return (
                                    <span className={`px-2 py-0.5 rounded text-xs text-white ${
                                        status.isOpen ? 'bg-green-600' : 'bg-red-500'
                                    }`}>
                                        {status.message}
                                    </span>
                                );
                            })()}
                            {!!vendor.is_verified && (
                                <span className="px-2 py-0.5 rounded text-xs bg-blue-500 text-white flex items-center gap-1">
                                    <CheckCircle size={12} />
                                    מאומת
                                </span>
                            )}
                            {vendor.avg_rating && Number(vendor.avg_rating) > 0 && (
                                <div className="flex items-center gap-1 text-amber-500 text-sm font-bold">
                                    <Star size={14} fill="currentColor" />
                                    {Number(vendor.avg_rating).toFixed(1)} ({vendor.review_count || 0})
                                </div>
                            )}
                        </div>

                        <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                            <div className="flex items-start gap-3">
                                <MapPin size={18} className="text-slate-400 shrink-0 mt-0.5" />
                                <span>{vendor.address}</span>
                            </div>
                            {vendor.phone && (
                                <div className="flex items-center gap-3">
                                    <Phone size={18} className="text-slate-400 shrink-0" />
                                    <a href={`tel:${vendor.phone}`} className="hover:text-blue-500">{vendor.phone}</a>
                                </div>
                            )}
                            {vendor.email && (
                                <div className="flex items-center gap-3">
                                    <Mail size={18} className="text-slate-400 shrink-0" />
                                    <a href={`mailto:${vendor.email}`} className="hover:text-blue-500">{vendor.email}</a>
                                </div>
                            )}
                            {vendor.website && (
                                <div className="flex items-center gap-3">
                                    <Globe size={18} className="text-slate-400 shrink-0" />
                                    <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                        אתר אינטרנט
                                    </a>
                                </div>
                            )}
                        </div>

                        {vendor.about_text && (
                            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                                <p className="text-sm italic text-slate-400">
                                    "{vendor.about_text}"
                                </p>
                            </div>
                        )}

                        {vendor.owner_name && (
                            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(vendor.owner_name)}`}
                                        alt={vendor.owner_name}
                                        className="w-10 h-10 rounded-full"
                                    />
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase font-bold">הבשלן/ית</p>
                                        <p className="font-medium text-slate-200">{vendor.owner_name}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Tabs & Content */}
                <div className="flex-1 flex flex-col bg-[#0d1424]/60 backdrop-blur-xl">
                    {/* Tabs */}
                    <div className="flex border-b border-slate-100 dark:border-slate-800 overflow-x-auto bg-[#0d1424]/60 backdrop-blur-xl z-10">
                        <button
                            onClick={() => setActiveTab('menu')}
                            className={`flex-1 min-w-[80px] py-3 px-2 font-bold text-xs border-b-2 transition-colors flex items-center justify-center gap-1 ${
                                activeTab === 'menu' ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-slate-400'
                            }`}>
                            <Utensils size={14} /> תפריט
                        </button>
                        <button
                            onClick={() => setActiveTab('reviews')}
                            className={`flex-1 min-w-[80px] py-3 px-2 font-bold text-xs border-b-2 transition-colors flex items-center justify-center gap-1 ${
                                activeTab === 'reviews' ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-slate-400'
                            }`}>
                            <MessageCircle size={14} /> ביקורות
                        </button>
                        <button
                            onClick={() => setActiveTab('hours')}
                            className={`flex-1 min-w-[80px] py-3 px-2 font-bold text-xs border-b-2 transition-colors flex items-center justify-center gap-1 ${
                                activeTab === 'hours' ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-slate-400'
                            }`}>
                            <Clock size={14} /> שעות
                        </button>
                        <button
                            onClick={() => setActiveTab('updates')}
                            className={`flex-1 min-w-[80px] py-3 px-2 font-bold text-xs border-b-2 transition-colors flex items-center justify-center gap-1 ${
                                activeTab === 'updates' ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-slate-400'
                            }`}>
                            <Bell size={14} /> עדכונים
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-50/50 dark:bg-slate-900">
                        {/* MENU TAB */}
                        {activeTab === 'menu' && (
                            <div className="space-y-4">
                                {loading ? (
                                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-400" /></div>
                                ) : !vendor.menu || vendor.menu.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400">
                                        <ShoppingBag size={48} className="mx-auto mb-4 opacity-50" />
                                        <p>עדיין לא הועלו מנות לתפריט</p>
                                    </div>
                                ) : (
                                    vendor.menu.map(item => (
                                        <div
                                            key={item.id}
                                            className="bg-[#0d1424]/60 backdrop-blur-xl p-4 rounded-xl border border-white/10 hover:shadow-md transition-all flex gap-4"
                                        >
                                            {item.image_url && (
                                                <img src={item.image_url} alt={item.name} className="w-20 h-20 rounded-lg object-cover bg-slate-100 shrink-0" />
                                            )}
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div>
                                                        <h3 className="font-bold text-amber-500">{item.name}</h3>
                                                        {item.name_hebrew && item.name_hebrew !== item.name && (
                                                            <p className="text-xs text-slate-400">{item.name_hebrew}</p>
                                                        )}
                                                    </div>
                                                    <span className="font-bold text-orange-600 dark:text-orange-400">
                                                        {item.currency === 'ILS' ? '₪' : item.currency}{item.price}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-400 mt-1 mb-2">{item.description}</p>
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        {item.category && (
                                                            <span className="text-xs px-2 py-0.5 bg-white/10 rounded text-slate-600 dark:text-slate-400">
                                                                {item.category}
                                                            </span>
                                                        )}
                                                        {!item.is_available && (
                                                            <span className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/30 rounded text-red-600 dark:text-red-400">
                                                                לא זמין
                                                            </span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => addToCart(item)}
                                                        disabled={!item.is_available || addingToCart === item.id}
                                                        className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                                    >
                                                        {addingToCart === item.id ? (
                                                            <Loader2 size={14} className="animate-spin" />
                                                        ) : (
                                                            <Plus size={14} />
                                                        )}
                                                        הוסף לסל
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* REVIEWS TAB */}
                        {activeTab === 'reviews' && (
                            <div className="space-y-6">
                                {/* Submit Review */}
                                {user && (
                                    <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-xl p-4 border border-white/10">
                                        <h3 className="font-bold mb-3">כתוב ביקורת</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-sm font-medium mb-2">דירוג</label>
                                                <div className="flex gap-1">
                                                    {[1, 2, 3, 4, 5].map(rating => (
                                                        <button
                                                            key={rating}
                                                            onClick={() => setNewReview({ ...newReview, rating })}
                                                            className={`p-1 ${newReview.rating >= rating ? 'text-amber-500' : 'text-slate-300'}`}
                                                        >
                                                            <Star size={24} fill={newReview.rating >= rating ? 'currentColor' : 'none'} />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-2">תגובה</label>
                                                <textarea
                                                    value={newReview.comment}
                                                    onChange={e => setNewReview({ ...newReview, comment: e.target.value })}
                                                    className="w-full p-2 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm text-white focus-visible:ring-2 focus-visible:ring-orange-500 outline-none"
                                                    rows={3}
                                                    placeholder="שתף את החוויה שלך..."
                                                />
                                            </div>
                                            <button
                                                onClick={submitReview}
                                                disabled={submittingReview}
                                                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg font-bold disabled:opacity-50"
                                            >
                                                {submittingReview ? <Loader2 className="animate-spin inline" size={16} /> : 'שלח ביקורת'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Reviews List */}
                                <div className="space-y-4">
                                    {reviews.length === 0 ? (
                                        <div className="text-center py-10 text-slate-400">
                                            <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                                            <p>עדיין אין ביקורות</p>
                                        </div>
                                    ) : (
                                        reviews.map(review => (
                                            <div key={review.id} className="bg-[#0d1424]/60 backdrop-blur-xl rounded-xl p-4 border border-white/10">
                                                <div className="flex items-start gap-3 mb-2">
                                                    <img
                                                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(review.user_name || 'User')}`}
                                                        alt={review.user_name}
                                                        className="w-10 h-10 rounded-full"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-bold text-amber-500">{review.user_name}</span>
                                                            {review.is_verified && (
                                                                <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                                                                    מאומת
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1 mb-2">
                                                            {[1, 2, 3, 4, 5].map(star => (
                                                                <Star
                                                                    key={star}
                                                                    size={14}
                                                                    className={star <= review.rating ? 'text-amber-500' : 'text-slate-300'}
                                                                    fill={star <= review.rating ? 'currentColor' : 'none'}
                                                                />
                                                            ))}
                                                        </div>
                                                        <p className="text-sm text-slate-600 dark:text-slate-300">{review.comment}</p>
                                                        <p className="text-xs text-slate-400 mt-2">
                                                            {new Date(review.created_at).toLocaleDateString('he-IL')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* HOURS TAB */}
                        {activeTab === 'hours' && (
                            <div className="space-y-4">
                                {!vendor.hours || vendor.hours.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400">
                                        <Clock size={48} className="mx-auto mb-4 opacity-50" />
                                        <p>שעות פתיחה לא הוגדרו</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Current Status Banner */}
                                        {(() => {
                                            const status = getVendorStatus(vendor);
                                            return (
                                                <div className={`p-4 rounded-xl border-2 ${
                                                    status.isOpen
                                                        ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                                                        : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                                                }`}>
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={20} className={status.isOpen ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} />
                                                        <span className={`font-bold ${
                                                            status.isOpen ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'
                                                        }`}>
                                                            {status.message}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-xl p-4 border border-white/10">
                                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                                <Clock size={20} />
                                                שעות פתיחה
                                            </h3>
                                        <div className="space-y-2">
                                            {vendor.hours.sort((a, b) => a.day_of_week - b.day_of_week).map(hour => (
                                                <div key={hour.id} className="flex justify-between items-center py-2 border-b border-white/10 last:border-0">
                                                    <span className="font-medium text-slate-700 dark:text-slate-300">
                                                        {getDayName(hour.day_of_week)}
                                                    </span>
                                                    <span className={`text-sm ${hour.is_closed ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                                                        {hour.is_closed ? 'סגור' : `${hour.open_time?.slice(0, 5)} - ${hour.close_time?.slice(0, 5)}`}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        {vendor.closures && vendor.closures.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-white/10">
                                                <h4 className="font-bold text-sm mb-2">סגירות מיוחדות</h4>
                                                <div className="space-y-1">
                                                    {vendor.closures.map(closure => (
                                                        <div key={closure.id} className="text-sm text-slate-600 dark:text-slate-400">
                                                            {new Date(closure.closure_date).toLocaleDateString('he-IL')} - {closure.reason || 'סגור'}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* UPDATES TAB */}
                        {activeTab === 'updates' && (
                            <div className="space-y-4">
                                {!vendor.updates || vendor.updates.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400">
                                        <Bell size={48} className="mx-auto mb-4 opacity-50" />
                                        <p>אין עדכונים</p>
                                    </div>
                                ) : (
                                    vendor.updates.filter(u => u.is_active).map(update => (
                                        <div key={update.id} className="bg-[#0d1424]/60 backdrop-blur-xl rounded-xl p-4 border border-white/10">
                                            {update.image_url && (
                                                <img src={update.image_url} alt={update.title} className="w-full h-48 object-cover rounded-lg mb-3" />
                                            )}
                                            <h3 className="font-bold text-lg mb-2">{update.title}</h3>
                                            <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{update.content}</p>
                                            <p className="text-xs text-slate-400">
                                                {new Date(update.created_at).toLocaleDateString('he-IL')}
                                                {update.expires_at && ` • בתוקף עד ${new Date(update.expires_at).toLocaleDateString('he-IL')}`}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
