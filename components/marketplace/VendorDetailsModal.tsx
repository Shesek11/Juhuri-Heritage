import React, { useState, useEffect } from 'react';
import { Vendor, MenuItem, marketplaceService } from '../../services/marketplaceService';
import { X, MapPin, Phone, Star, Clock, ShoppingBag, Send, Loader2, Utensils } from 'lucide-react';

interface VendorDetailsModalProps {
    vendor: Vendor;
    onClose: () => void;
}

export const VendorDetailsModal: React.FC<VendorDetailsModalProps> = ({ vendor: initialVendor, onClose }) => {
    const [vendor, setVendor] = useState<Vendor>(initialVendor);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'menu' | 'about' | 'contact'>('menu');
    const [inquiryMessage, setInquiryMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [sentSuccess, setSentSuccess] = useState(false);
    const [selectedItems, setSelectedItems] = useState<number[]>([]);

    useEffect(() => {
        loadVendorDetails();
    }, [initialVendor.id]);

    const loadVendorDetails = async () => {
        setLoading(true);
        try {
            const data = await marketplaceService.getVendorById(initialVendor.id);
            setVendor(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSendInquiry = async () => {
        if (!inquiryMessage.trim()) return;
        setSending(true);
        try {
            await marketplaceService.sendInquiry({
                vendor_id: vendor.id,
                message: inquiryMessage,
                items: selectedItems
            });
            setSentSuccess(true);
            setInquiryMessage('');
            setSelectedItems([]);
            setTimeout(() => setSentSuccess(false), 3000);
        } catch (err) {
            console.error(err);
            alert('שגיאה בשליחת ההודעה');
        } finally {
            setSending(false);
        }
    };

    const toggleItemSelection = (id: number) => {
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex overflow-hidden lg:flex-row flex-col" onClick={e => e.stopPropagation()}>

                {/* Left Side (Desktop) / Top (Mobile): Cover & Info */}
                <div className="w-full lg:w-1/3 bg-slate-50 dark:bg-slate-950 flex flex-col border-l border-slate-200 dark:border-slate-800">
                    <div className="h-48 lg:h-64 relative">
                        <img
                            src={vendor.cover_image}
                            alt={vendor.business_name}
                            className="w-full h-full object-cover"
                        />
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{vendor.business_name}</h2>

                        <div className="flex items-center gap-2 mb-4">
                            <span className={`px-2 py-0.5 rounded text-xs text-white ${vendor.is_open ? 'bg-green-600' : 'bg-red-500'}`}>
                                {vendor.is_open ? 'פתוח להזמנות' : 'סגור כרגע'}
                            </span>
                            <div className="flex items-center gap-1 text-amber-500 text-sm font-bold">
                                <Star size={14} fill="currentColor" />
                                {vendor.rating}
                            </div>
                        </div>

                        <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                            <div className="flex items-start gap-3">
                                <MapPin size={18} className="text-slate-400 shrink-0 mt-0.5" />
                                <span>{vendor.address}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone size={18} className="text-slate-400 shrink-0" />
                                <span dir="ltr">{vendor.phone}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Clock size={18} className="text-slate-400 shrink-0" />
                                <span>
                                    {vendor.opening_hours ? 'שעות פעילות משתנות' : 'בתיאום מראש'}
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <img
                                    src={vendor.owner_avatar || `https://ui-avatars.com/api/?name=${vendor.owner_name}`}
                                    alt={vendor.owner_name}
                                    className="w-10 h-10 rounded-full"
                                />
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">הבשלן/ית</p>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">{vendor.owner_name}</p>
                                </div>
                            </div>
                            <p className="mt-4 text-sm italic text-slate-500">
                                "{vendor.description}"
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Side (Desktop) / Bottom (Mobile): Menu & Actions */}
                <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 relative">
                    {/* Tabs */}
                    <div className="flex border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
                        <button
                            onClick={() => setActiveTab('menu')}
                            className={`flex-1 py-4 font-bold text-sm border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'menu' ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                            <Utensils size={16} /> תפריט
                        </button>
                        <button
                            onClick={() => setActiveTab('contact')}
                            className={`flex-1 py-4 font-bold text-sm border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'contact' ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                            <Send size={16} /> יצירת קשר
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-50/50 dark:bg-slate-900">
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
                                            onClick={() => toggleItemSelection(item.id)}
                                            className={`bg-white dark:bg-slate-800 p-4 rounded-xl border transition-all cursor-pointer flex gap-4 ${selectedItems.includes(item.id)
                                                    ? 'border-orange-500 ring-1 ring-orange-500 shadow-md'
                                                    : 'border-slate-100 dark:border-slate-700 hover:border-orange-300'
                                                }`}
                                        >
                                            {item.image_url && (
                                                <img src={item.image_url} alt={item.title} className="w-20 h-20 rounded-lg object-cover bg-slate-100" />
                                            )}
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-bold text-slate-800 dark:text-slate-100">{item.title}</h3>
                                                    <span className="font-bold text-orange-600 dark:text-orange-400">₪{item.price}</span>
                                                </div>
                                                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-400">
                                                        {item.category === 'main' ? 'עיקרית' : item.category === 'side' ? 'תוספת' : 'קינוח'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 shrink-0 ${selectedItems.includes(item.id) ? 'border-orange-500 bg-orange-500' : 'border-slate-300'
                                                }`}>
                                                {selectedItems.includes(item.id) && <X size={14} className="text-white rotate-45" />}
                                                {/* Actually checkmark would be better but X rotate 45 is basically plus/check depending on context, let's use check svg */}
                                                {selectedItems.includes(item.id) && (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                                {vendor.menu && vendor.menu.length > 0 && (
                                    <div className="text-center text-xs text-slate-400 mt-4">
                                        בחר מנות שברצונך להזמין ואינך ללשונית "יצירת קשר"
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'contact' && (
                            <div className="max-w-md mx-auto py-4">
                                <h3 className="font-bold text-lg mb-4">שלח הודעה ל{vendor.owner_name}</h3>

                                {selectedItems.length > 0 && (
                                    <div className="mb-4 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-100 dark:border-orange-900/40 text-sm">
                                        <p className="font-bold text-orange-800 dark:text-orange-300 mb-1">מנות שנבחרו ({selectedItems.length}):</p>
                                        <ul className="list-disc list-inside text-slate-600 dark:text-slate-400">
                                            {vendor.menu?.filter(i => selectedItems.includes(i.id)).map(i => (
                                                <li key={i.id}>{i.title}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">ההודעה שלך</label>
                                        <textarea
                                            value={inquiryMessage}
                                            onChange={e => setInquiryMessage(e.target.value)}
                                            className="w-full p-3 rounded-xl border dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-orange-500 outline-none h-32 resize-none"
                                            placeholder={`היי, אשמח להזמין את המנות שסימנתי ליום שישי...\nהאם אפשר לעשות משלוח ל...?`}
                                        />
                                    </div>

                                    <button
                                        onClick={handleSendInquiry}
                                        disabled={!inquiryMessage.trim() || sending || sentSuccess}
                                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${sentSuccess
                                                ? 'bg-green-500 text-white shadow-green-500/30'
                                                : 'bg-slate-900 dark:bg-slate-700 text-white shadow-slate-900/20 hover:scale-[1.02]'
                                            }`}
                                    >
                                        {sending ? (
                                            <Loader2 className="animate-spin" />
                                        ) : sentSuccess ? (
                                            <>ההודעה נשלחה! ✅</>
                                        ) : (
                                            <>שלח הודעה <Send size={18} /></>
                                        )}
                                    </button>

                                    <p className="text-xs text-center text-slate-400">
                                        ההודעה תישלח ישירות לבשלן/ית. התשלום והתיאום נעשים מולם באופן ישיר.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
