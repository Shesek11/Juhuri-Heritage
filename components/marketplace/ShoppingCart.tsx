import React, { useState, useEffect } from 'react';
import { CartItem, marketplaceService } from '../../services/marketplaceService';
import { ShoppingCart as CartIcon, X, Plus, Minus, Trash2, Loader2, CheckCircle } from 'lucide-react';

interface ShoppingCartProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ShoppingCart: React.FC<ShoppingCartProps> = ({ isOpen, onClose }) => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadCart();
        }
    }, [isOpen]);

    const loadCart = async () => {
        setLoading(true);
        try {
            const data = await marketplaceService.getCart();
            setCart(data);
        } catch (err) {
            console.error('Failed to load cart:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateQuantity = async (cartItemId: number, newQuantity: number) => {
        if (newQuantity < 1) return;
        setUpdating(cartItemId);
        try {
            await marketplaceService.updateCartItem(cartItemId, { quantity: newQuantity });
            await loadCart();
        } catch (err) {
            console.error('Failed to update quantity:', err);
        } finally {
            setUpdating(null);
        }
    };

    const removeItem = async (cartItemId: number) => {
        setUpdating(cartItemId);
        try {
            await marketplaceService.removeFromCart(cartItemId);
            await loadCart();
        } catch (err) {
            console.error('Failed to remove item:', err);
        } finally {
            setUpdating(null);
        }
    };

    const clearCart = async () => {
        if (!confirm('האם אתה בטוח שברצונך לרוקן את הסל?')) return;
        setLoading(true);
        try {
            await marketplaceService.clearCart();
            setCart([]);
        } catch (err) {
            console.error('Failed to clear cart:', err);
        } finally {
            setLoading(false);
        }
    };

    const totalPrice = cart.reduce((sum, item) => {
        const price = item.item_price || 0;
        return sum + (price * item.quantity);
    }, 0);

    // Group items by vendor
    const groupedCart = cart.reduce((acc, item) => {
        const vendorId = item.vendor_id || 0;
        if (!acc[vendorId]) {
            acc[vendorId] = {
                vendor_name: item.vendor_name || 'Unknown',
                vendor_slug: item.vendor_slug || '',
                items: []
            };
        }
        acc[vendorId].items.push(item);
        return acc;
    }, {} as Record<number, { vendor_name: string; vendor_slug: string; items: CartItem[] }>);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-end md:items-center md:justify-end p-0 md:p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-900 w-full md:w-96 h-[90vh] md:h-[85vh] md:rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom md:slide-in-from-right duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-orange-50 to-white dark:from-slate-900 dark:to-slate-800">
                    <div className="flex items-center gap-2">
                        <div className="bg-orange-100 dark:bg-orange-900/40 p-2 rounded-lg">
                            <CartIcon className="text-orange-600 dark:text-orange-400" size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                            סל קניות ({cart.length})
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={24} />
                    </button>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="animate-spin text-slate-400" size={32} />
                        </div>
                    ) : cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <CartIcon size={64} className="mb-4 opacity-50" />
                            <p className="text-lg font-medium">הסל ריק</p>
                            <p className="text-sm">הוסף מנות כדי להתחיל</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(groupedCart).map(([vendorId, vendor]) => (
                                <div key={vendorId} className="space-y-3">
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                                        🏪 {vendor.vendor_name}
                                    </h3>
                                    {vendor.items.map(item => (
                                        <div
                                            key={item.id}
                                            className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700"
                                        >
                                            <div className="flex gap-3">
                                                {item.item_image_url && (
                                                    <img
                                                        src={item.item_image_url}
                                                        alt={item.item_name}
                                                        className="w-16 h-16 rounded-lg object-cover"
                                                    />
                                                )}
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                                                        {item.item_name}
                                                    </h4>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                        {item.item_currency === 'ILS' ? '₪' : item.item_currency}
                                                        {item.item_price}
                                                    </p>
                                                    {item.notes && (
                                                        <p className="text-xs text-slate-500 mt-1 italic">
                                                            "{item.notes}"
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <button
                                                        onClick={() => removeItem(item.id)}
                                                        disabled={updating === item.id}
                                                        className="text-red-500 hover:text-red-700 disabled:opacity-50"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                    <div className="flex items-center gap-1 bg-white dark:bg-slate-700 rounded-lg">
                                                        <button
                                                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                            disabled={updating === item.id || item.quantity <= 1}
                                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-600 rounded disabled:opacity-50"
                                                        >
                                                            <Minus size={14} />
                                                        </button>
                                                        <span className="px-2 font-bold text-sm">
                                                            {updating === item.id ? <Loader2 size={14} className="animate-spin" /> : item.quantity}
                                                        </span>
                                                        <button
                                                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                            disabled={updating === item.id}
                                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-600 rounded disabled:opacity-50"
                                                        >
                                                            <Plus size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {cart.length > 0 && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-3">
                        <div className="flex justify-between items-center text-lg font-bold">
                            <span className="text-slate-700 dark:text-slate-300">סה"כ:</span>
                            <span className="text-orange-600 dark:text-orange-400">
                                ₪{totalPrice.toFixed(2)}
                            </span>
                        </div>

                        <div className="space-y-2">
                            <button
                                onClick={() => alert('תשלום יתווסף בעתיד. כרגע ניתן לפנות ישירות למוכרים.')}
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"
                            >
                                <CheckCircle size={18} />
                                המשך לתשלום
                            </button>
                            <button
                                onClick={clearCart}
                                className="w-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-lg font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                            >
                                רוקן סל
                            </button>
                        </div>

                        <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                            התשלום והאיסוף נעשים ישירות מול המוכר
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
