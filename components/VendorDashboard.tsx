import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    Vendor,
    MenuItem,
    CreateMenuItemInput,
    CreateUpdateInput,
    SetHoursInput,
    Order,
    VendorStatistics,
    marketplaceService
} from '../services/marketplaceService';
import {
    Store,
    Utensils,
    Clock,
    Bell,
    Star,
    Plus,
    Edit,
    Trash2,
    Loader2,
    Save,
    X,
    MessageCircle,
    TrendingUp,
    ShoppingBag
} from 'lucide-react';
import { NotificationBell } from './marketplace/NotificationBell';

export const VendorDashboard: React.FC = () => {
    const { user } = useAuth();
    const [vendor, setVendor] = useState<Vendor | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'menu' | 'hours' | 'updates' | 'reviews' | 'orders' | 'statistics'>('orders');

    // Orders state
    const [orders, setOrders] = useState<Order[]>([]);

    // Statistics state
    const [statistics, setStatistics] = useState<VendorStatistics | null>(null);

    // Menu state
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [newItem, setNewItem] = useState<Partial<CreateMenuItemInput>>({
        name: '',
        price: 0,
        currency: 'ILS',
        is_available: true
    });

    // Update state
    const [newUpdate, setNewUpdate] = useState<CreateUpdateInput>({
        title: '',
        content: ''
    });

    useEffect(() => {
        loadVendorData();
    }, []);

    useEffect(() => {
        if (vendor && activeTab === 'orders') {
            loadOrders();
        }
        if (vendor && activeTab === 'statistics') {
            loadStatistics();
        }
    }, [vendor, activeTab]);

    const loadVendorData = async () => {
        setLoading(true);
        try {
            const vendorData = await marketplaceService.getMyVendor();
            if (vendorData) {
                setVendor(vendorData);
                if (vendorData.menu) {
                    setMenuItems(vendorData.menu);
                }
            }
        } catch (err) {
            console.error('Failed to load vendor data:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadOrders = async () => {
        if (!vendor) return;

        try {
            const ordersData = await marketplaceService.getVendorOrders(vendor.id);
            setOrders(ordersData);
        } catch (err) {
            console.error('Failed to load orders:', err);
        }
    };

    const updateOrderStatus = async (orderId: number, newStatus: string) => {
        try {
            await marketplaceService.updateOrderStatus(orderId, newStatus as any);
            alert('✅ סטטוס ההזמנה עודכן!');
            loadOrders();
        } catch (err) {
            console.error('Failed to update order status:', err);
            alert('שגיאה בעדכון סטטוס ההזמנה');
        }
    };

    const loadStatistics = async () => {
        if (!vendor) return;

        try {
            const stats = await marketplaceService.getVendorStatistics(vendor.id);
            setStatistics(stats);
        } catch (err) {
            console.error('Failed to load statistics:', err);
        }
    };

    const addMenuItem = async () => {
        if (!vendor || !newItem.name || !newItem.price) {
            alert('יש למלא שם ומחיר');
            return;
        }

        try {
            await marketplaceService.addMenuItem(vendor.id, newItem as CreateMenuItemInput);
            alert('✅ המנה נוספה בהצלחה!');
            setNewItem({name: '', price: 0, currency: 'ILS', is_available: true });
            await loadVendorData();
        } catch (err) {
            console.error('Failed to add menu item:', err);
            alert('שגיאה בהוספת המנה');
        }
    };

    const updateMenuItem = async () => {
        if (!editingItem) return;

        try {
            await marketplaceService.updateMenuItem(editingItem.id, editingItem);
            alert('✅ המנה עודכנה בהצלחה!');
            setEditingItem(null);
            await loadVendorData();
        } catch (err) {
            console.error('Failed to update menu item:', err);
            alert('שגיאה בעדכון המנה');
        }
    };

    const deleteMenuItem = async (itemId: number) => {
        if (!confirm('האם אתה בטוח שברצונך למחוק מנה זו?')) return;

        try {
            await marketplaceService.deleteMenuItem(itemId);
            alert('✅ המנה נמחקה בהצלחה!');
            await loadVendorData();
        } catch (err) {
            console.error('Failed to delete menu item:', err);
            alert('שגיאה במחיקת המנה');
        }
    };

    const publishUpdate = async () => {
        if (!vendor || !newUpdate.title) {
            alert('יש למלא כותרת');
            return;
        }

        try {
            await marketplaceService.createUpdate(vendor.id, newUpdate);
            alert('✅ העדכון פורסם בהצלחה!');
            setNewUpdate({ title: '', content: '' });
            await loadVendorData();
        } catch (err) {
            console.error('Failed to publish update:', err);
            alert('שגיאה בפרסום העדכון');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <Loader2 className="animate-spin text-orange-600" size={48} />
            </div>
        );
    }

    if (!vendor) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh]">
                <Store size={64} className="text-slate-300 mb-4" />
                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200">אין לך חנות</h2>
                <p className="text-slate-500 mt-2">צור חנות חדשה כדי להתחיל למכור</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4">
            {/* Header with Stats */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{vendor.name}</h1>
                        <p className="text-slate-500">{vendor.address}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <NotificationBell />
                        <div className={`px-4 py-2 rounded-lg font-bold ${
                            vendor.status === 'active' ? 'bg-green-100 text-green-700' :
                            vendor.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                        }`}>
                            {vendor.status === 'active' ? 'פעיל' : vendor.status === 'pending' ? 'ממתין לאישור' : 'מושעה'}
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">דירוג ממוצע</p>
                                <p className="text-2xl font-bold flex items-center gap-1">
                                    <Star size={24} fill="orange" className="text-orange-500" />
                                    {vendor.avg_rating?.toFixed(1) || 'N/A'}
                                </p>
                            </div>
                            <TrendingUp className="text-orange-500" size={32} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">ביקורות</p>
                                <p className="text-2xl font-bold">{vendor.review_count || 0}</p>
                            </div>
                            <MessageCircle className="text-blue-500" size={32} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">מנות בתפריט</p>
                                <p className="text-2xl font-bold">{menuItems.length}</p>
                            </div>
                            <Utensils className="text-green-500" size={32} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`px-4 py-3 font-bold border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === 'orders' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500'
                    }`}
                >
                    <ShoppingBag size={18} /> הזמנות
                </button>
                <button
                    onClick={() => setActiveTab('statistics')}
                    className={`px-4 py-3 font-bold border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === 'statistics' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500'
                    }`}
                >
                    <TrendingUp size={18} /> סטטיסטיקה
                </button>
                <button
                    onClick={() => setActiveTab('menu')}
                    className={`px-4 py-3 font-bold border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === 'menu' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500'
                    }`}
                >
                    <Utensils size={18} /> ניהול תפריט
                </button>
                <button
                    onClick={() => setActiveTab('hours')}
                    className={`px-4 py-3 font-bold border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === 'hours' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500'
                    }`}
                >
                    <Clock size={18} /> שעות פתיחה
                </button>
                <button
                    onClick={() => setActiveTab('updates')}
                    className={`px-4 py-3 font-bold border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === 'updates' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500'
                    }`}
                >
                    <Bell size={18} /> עדכונים ומבצעים
                </button>
                <button
                    onClick={() => setActiveTab('reviews')}
                    className={`px-4 py-3 font-bold border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === 'reviews' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500'
                    }`}
                >
                    <MessageCircle size={18} /> ביקורות
                </button>
            </div>

            {/* Tab Content */}
            <div>
                {/* MENU TAB */}
                {activeTab === 'menu' && (
                    <div className="space-y-6">
                        {/* Add New Item Form */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Plus size={20} />
                                הוסף מנה חדשה
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    placeholder="שם המנה"
                                    value={newItem.name || ''}
                                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                    className="p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                />
                                <input
                                    type="text"
                                    placeholder="שם בעברית (אופציונלי)"
                                    value={newItem.name_hebrew || ''}
                                    onChange={e => setNewItem({ ...newItem, name_hebrew: e.target.value })}
                                    className="p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                />
                                <textarea
                                    placeholder="תיאור"
                                    value={newItem.description || ''}
                                    onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                    className="p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                    rows={2}
                                />
                                <input
                                    type="text"
                                    placeholder="קטגוריה (לדוגמה: עיקרית, תוספת)"
                                    value={newItem.category || ''}
                                    onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                                    className="p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                />
                                <input
                                    type="number"
                                    placeholder="מחיר"
                                    value={newItem.price || 0}
                                    onChange={e => setNewItem({ ...newItem, price: parseFloat(e.target.value) })}
                                    className="p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                />
                                <input
                                    type="url"
                                    placeholder="קישור לתמונה (אופציונלי)"
                                    value={newItem.image_url || ''}
                                    onChange={e => setNewItem({ ...newItem, image_url: e.target.value })}
                                    className="p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                />
                            </div>
                            <button
                                onClick={addMenuItem}
                                className="mt-4 bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2"
                            >
                                <Plus size={18} />
                                הוסף מנה
                            </button>
                        </div>

                        {/* Existing Menu Items */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold">מנות קיימות</h3>
                            {menuItems.length === 0 ? (
                                <p className="text-slate-500">אין מנות בתפריט</p>
                            ) : (
                                menuItems.map(item => (
                                    <div key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                        {editingItem?.id === item.id ? (
                                            <div className="space-y-3">
                                                <input
                                                    type="text"
                                                    value={editingItem.name}
                                                    onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                                                    className="w-full p-2 rounded-lg border dark:bg-slate-700"
                                                />
                                                <textarea
                                                    value={editingItem.description || ''}
                                                    onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                                                    className="w-full p-2 rounded-lg border dark:bg-slate-700"
                                                    rows={2}
                                                />
                                                <input
                                                    type="number"
                                                    value={editingItem.price}
                                                    onChange={e => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) })}
                                                    className="w-full p-2 rounded-lg border dark:bg-slate-700"
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={updateMenuItem}
                                                        className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                                                    >
                                                        <Save size={16} /> שמור
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingItem(null)}
                                                        className="bg-slate-500 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                                                    >
                                                        <X size={16} /> ביטול
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-lg">{item.name}</h4>
                                                    {item.name_hebrew && <p className="text-sm text-slate-400">{item.name_hebrew}</p>}
                                                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{item.description}</p>
                                                    <div className="flex items-center gap-3 mt-2">
                                                        <span className="font-bold text-orange-600">₪{item.price}</span>
                                                        {item.category && (
                                                            <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">{item.category}</span>
                                                        )}
                                                        <span className={`text-xs px-2 py-0.5 rounded ${
                                                            item.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                        }`}>
                                                            {item.is_available ? 'זמין' : 'לא זמין'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setEditingItem(item)}
                                                        className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 rounded-lg"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteMenuItem(item.id)}
                                                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* HOURS TAB */}
                {activeTab === 'hours' && (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold mb-4">ניהול שעות פתיחה</h3>
                        <p className="text-slate-500 mb-4">
                            תכונה זו תאפשר לך לערוך שעות פתיחה ולהגדיר סגירות מיוחדות. בקרוב!
                        </p>
                    </div>
                )}

                {/* UPDATES TAB */}
                {activeTab === 'updates' && (
                    <div className="space-y-6">
                        {/* Add New Update Form */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Plus size={20} />
                                פרסם עדכון חדש
                            </h3>
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="כותרת העדכון"
                                    value={newUpdate.title}
                                    onChange={e => setNewUpdate({ ...newUpdate, title: e.target.value })}
                                    className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                />
                                <textarea
                                    placeholder="תוכן העדכון"
                                    value={newUpdate.content}
                                    onChange={e => setNewUpdate({ ...newUpdate, content: e.target.value })}
                                    className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                    rows={4}
                                />
                                <input
                                    type="url"
                                    placeholder="קישור לתמונה (אופציונלי)"
                                    value={newUpdate.image_url || ''}
                                    onChange={e => setNewUpdate({ ...newUpdate, image_url: e.target.value })}
                                    className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                />
                                <button
                                    onClick={publishUpdate}
                                    className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2"
                                >
                                    <Bell size={18} />
                                    פרסם עדכון
                                </button>
                            </div>
                        </div>

                        {/* Existing Updates */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold">עדכונים קיימים</h3>
                            {vendor.updates && vendor.updates.length > 0 ? (
                                vendor.updates.map(update => (
                                    <div key={update.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <h4 className="font-bold text-lg">{update.title}</h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{update.content}</p>
                                        <p className="text-xs text-slate-400 mt-2">
                                            {new Date(update.created_at).toLocaleDateString('he-IL')}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-slate-500">אין עדכונים</p>
                            )}
                        </div>
                    </div>
                )}

                {/* ORDERS TAB */}
                {activeTab === 'orders' && (
                    <div className="space-y-4">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold mb-4">ההזמנות שלי</h3>

                            {orders.length === 0 ? (
                                <div className="text-center py-10 text-slate-400">
                                    <ShoppingBag size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>אין הזמנות עדיין</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {orders.map(order => (
                                        <div
                                            key={order.id}
                                            className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h4 className="font-bold text-slate-800 dark:text-slate-100">
                                                        הזמנה #{order.order_number}
                                                    </h4>
                                                    <p className="text-sm text-slate-500">
                                                        {order.customer_name} • {order.customer_phone}
                                                    </p>
                                                    {order.pickup_time && (
                                                        <p className="text-sm text-slate-500">
                                                            איסוף: {new Date(order.pickup_time).toLocaleString('he-IL')}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-bold text-orange-600 dark:text-orange-400">
                                                        ₪{order.total_price}
                                                    </p>
                                                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                                                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                        order.status === 'confirmed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                                        order.status === 'ready' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                                        order.status === 'completed' ? 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300' :
                                                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                    }`}>
                                                        {order.status === 'pending' ? 'ממתין' :
                                                         order.status === 'confirmed' ? 'אושר' :
                                                         order.status === 'ready' ? 'מוכן' :
                                                         order.status === 'completed' ? 'הושלם' :
                                                         'בוטל'}
                                                    </span>
                                                </div>
                                            </div>

                                            {order.customer_notes && (
                                                <div className="mb-3 p-2 bg-slate-100 dark:bg-slate-800 rounded text-sm text-slate-600 dark:text-slate-400">
                                                    <strong>הערות:</strong> {order.customer_notes}
                                                </div>
                                            )}

                                            {order.items && order.items.length > 0 && (
                                                <div className="mb-3 text-sm text-slate-600 dark:text-slate-400">
                                                    <strong>פריטים:</strong>
                                                    <ul className="list-disc list-inside mt-1">
                                                        {order.items.map(item => (
                                                            <li key={item.id}>
                                                                {item.menu_item_name} x{item.quantity} - ₪{item.price_at_order}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            <div className="flex gap-2">
                                                {order.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => updateOrderStatus(order.id, 'confirmed')}
                                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-bold"
                                                        >
                                                            אשר הזמנה
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const reason = prompt('סיבת ביטול:');
                                                                if (reason) updateOrderStatus(order.id, 'cancelled');
                                                            }}
                                                            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-bold"
                                                        >
                                                            בטל
                                                        </button>
                                                    </>
                                                )}
                                                {order.status === 'confirmed' && (
                                                    <button
                                                        onClick={() => updateOrderStatus(order.id, 'ready')}
                                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-bold"
                                                    >
                                                        סמן כמוכן
                                                    </button>
                                                )}
                                                {order.status === 'ready' && (
                                                    <button
                                                        onClick={() => updateOrderStatus(order.id, 'completed')}
                                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-bold"
                                                    >
                                                        סמן כהושלם
                                                    </button>
                                                )}
                                            </div>

                                            <p className="text-xs text-slate-400 mt-3">
                                                נוצר: {new Date(order.created_at).toLocaleString('he-IL')}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* STATISTICS TAB */}
                {activeTab === 'statistics' && (
                    <div className="space-y-6">
                        {!statistics ? (
                            <div className="text-center py-10">
                                <Loader2 className="animate-spin text-orange-600 mx-auto mb-4" size={48} />
                                <p className="text-slate-400">טוען סטטיסטיקה...</p>
                            </div>
                        ) : (
                            <>
                                {/* Overview Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-xl shadow-lg">
                                        <p className="text-sm opacity-90">סה\"כ הזמנות</p>
                                        <p className="text-3xl font-bold">{statistics.overview.total_orders || 0}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-xl shadow-lg">
                                        <p className="text-sm opacity-90">הזמנות שהושלמו</p>
                                        <p className="text-3xl font-bold">{statistics.overview.completed_orders || 0}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-xl shadow-lg">
                                        <p className="text-sm opacity-90">סה\"כ הכנסות</p>
                                        <p className="text-3xl font-bold">₪{statistics.overview.total_revenue?.toFixed(0) || 0}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-xl shadow-lg">
                                        <p className="text-sm opacity-90">ממוצע הזמנה</p>
                                        <p className="text-3xl font-bold">₪{statistics.overview.avg_order_value?.toFixed(0) || 0}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-pink-500 to-pink-600 text-white p-4 rounded-xl shadow-lg">
                                        <p className="text-sm opacity-90">לקוחות ייחודיים</p>
                                        <p className="text-3xl font-bold">{statistics.overview.unique_customers || 0}</p>
                                    </div>
                                </div>

                                {/* Daily Orders Chart */}
                                {statistics.daily_orders && statistics.daily_orders.length > 0 && (
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                            <TrendingUp size={20} />
                                            הזמנות ב-7 הימים האחרונים
                                        </h3>
                                        <div className="space-y-2">
                                            {statistics.daily_orders.map((day, idx) => {
                                                const maxOrders = Math.max(...statistics.daily_orders.map(d => d.orders_count));
                                                const widthPercent = maxOrders > 0 ? (day.orders_count / maxOrders) * 100 : 0;

                                                return (
                                                    <div key={idx} className="flex items-center gap-3">
                                                        <span className="text-sm text-slate-600 dark:text-slate-400 w-24 shrink-0">
                                                            {new Date(day.order_date).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' })}
                                                        </span>
                                                        <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-8 overflow-hidden">
                                                            <div
                                                                className="bg-gradient-to-r from-orange-500 to-orange-600 h-full flex items-center px-3 text-white text-sm font-bold transition-all"
                                                                style={{ width: `${widthPercent}%` }}
                                                            >
                                                                {day.orders_count > 0 && `${day.orders_count} הזמנות`}
                                                            </div>
                                                        </div>
                                                        <span className="text-sm font-bold text-green-600 dark:text-green-400 w-20 text-left shrink-0">
                                                            ₪{day.daily_revenue?.toFixed(0) || 0}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Top Selling Items */}
                                {statistics.top_items && statistics.top_items.length > 0 && (
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                            <Star size={20} />
                                            המנות הפופולריות ביותר
                                        </h3>
                                        <div className="space-y-3">
                                            {statistics.top_items.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                                                            idx === 0 ? 'bg-amber-500' :
                                                            idx === 1 ? 'bg-slate-400' :
                                                            idx === 2 ? 'bg-orange-600' :
                                                            'bg-slate-300'
                                                        }`}>
                                                            {idx + 1}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800 dark:text-slate-100">
                                                                {item.item_name}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                {item.times_ordered} פעמים
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <p className="font-bold text-green-600 dark:text-green-400">
                                                        ₪{item.total_revenue?.toFixed(0) || 0}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* REVIEWS TAB */}
                {activeTab === 'reviews' && (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold mb-4">ביקורות</h3>
                        <p className="text-slate-500">
                            צפייה בביקורות תתווסף בקרוב. כרגע ניתן לראות ביקורות דרך עמוד החנות הציבורי.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
