// AdminTagsPanel Component
// Admin interface for managing recipe tags

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Tag, Loader2 } from 'lucide-react';
import { RecipeTag } from '../../services/recipesService';
import apiService from '../../services/apiService';

// Category options - will be managed by admins
const DEFAULT_CATEGORIES = [
    { value: 'food_type', label: 'סוג מאכל', icon: '🍽️' },
    { value: 'meal_type', label: 'סוג ארוחה', icon: '🍴' },
    { value: 'ingredient_type', label: 'מרכיב עיקרי', icon: '🥘' },
    { value: 'occasion', label: 'אירוע/חג', icon: '🎉' },
    { value: 'difficulty', label: 'רמת קושי', icon: '📊' },
    { value: 'origin', label: 'מקור', icon: '🌍' },
    { value: 'cooking_method', label: 'שיטת בישול', icon: '🔥' },
    { value: 'dietary', label: 'תזונה מיוחדת', icon: '💚' },
    { value: 'season', label: 'עונה', icon: '🌤️' },
    { value: 'general', label: 'כללי', icon: '📌' }
];

interface TagFormData {
    name: string;
    name_hebrew: string;
    icon: string;
    color: string;
    category: string;
}

interface Category {
    value: string;
    label: string;
    icon: string;
}

export const AdminTagsPanel: React.FC = () => {
    const [tags, setTags] = useState<RecipeTag[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
    const [newCategory, setNewCategory] = useState({ value: '', label: '', icon: '' });

    const [formData, setFormData] = useState<TagFormData>({
        name: '',
        name_hebrew: '',
        icon: '',
        color: '#F59E0B',
        category: 'general'
    });

    useEffect(() => {
        loadTags();
        // Load custom categories from localStorage
        const savedCategories = localStorage.getItem('recipe_categories');
        if (savedCategories) {
            try {
                setCategories(JSON.parse(savedCategories));
            } catch (e) {
                console.error('Failed to load categories:', e);
            }
        }
    }, []);

    const loadTags = async () => {
        try {
            setLoading(true);
            const response = await apiService.get<RecipeTag[]>('/recipes/meta/tags');
            setTags(response);
        } catch (err: any) {
            setError(err.message || 'שגיאה בטעינת התגיות');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                // Update existing tag
                await apiService.put(`/recipes/admin/tags/${editingId}`, formData);
            } else {
                // Create new tag
                await apiService.post('/recipes/admin/tags', formData);
            }

            await loadTags();
            resetForm();
        } catch (err: any) {
            alert(err.message || 'שגיאה בשמירת התגית');
        }
    };

    const handleEdit = (tag: RecipeTag) => {
        setEditingId(tag.id);
        setFormData({
            name: tag.name,
            name_hebrew: tag.name_hebrew,
            icon: tag.icon,
            color: tag.color,
            category: tag.category || 'general'
        });
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('האם אתה בטוח שברצונך למחוק תגית זו?')) return;

        try {
            await apiService.delete(`/recipes/admin/tags/${id}`);
            await loadTags();
        } catch (err: any) {
            alert(err.message || 'שגיאה במחיקת התגית');
        }
    };

    const handleAddCategory = () => {
        if (!newCategory.value || !newCategory.label) {
            alert('נא למלא שם ותווית לקטגוריה');
            return;
        }

        if (categories.some(c => c.value === newCategory.value)) {
            alert('קטגוריה עם שם זה כבר קיימת');
            return;
        }

        const updatedCategories = [...categories, { ...newCategory }];
        setCategories(updatedCategories);
        localStorage.setItem('recipe_categories', JSON.stringify(updatedCategories));
        setNewCategory({ value: '', label: '', icon: '' });
        alert('הקטגוריה נוספה בהצלחה!');
    };

    const handleDeleteCategory = (value: string) => {
        // Check if category is in use
        const inUse = tags.some(tag => tag.category === value);
        if (inUse) {
            alert(`לא ניתן למחוק קטגוריה זו - היא בשימוש על ידי תגיות`);
            return;
        }

        if (!confirm(`האם למחוק את הקטגוריה "${value}"?`)) return;

        const updatedCategories = categories.filter(c => c.value !== value);
        setCategories(updatedCategories);
        localStorage.setItem('recipe_categories', JSON.stringify(updatedCategories));
        alert('הקטגוריה נמחקה');
    };

    const resetForm = () => {
        setFormData({
            name: '',
            name_hebrew: '',
            icon: '',
            color: '#F59E0B',
            category: 'general'
        });
        setEditingId(null);
        setShowModal(false);
    };

    const filteredTags = filterCategory === 'all'
        ? tags
        : tags.filter(tag => (tag.category || 'general') === filterCategory);

    const tagsByCategory = categories.map(cat => ({
        ...cat,
        tags: tags.filter(tag => (tag.category || 'general') === cat.value),
        count: tags.filter(tag => (tag.category || 'general') === cat.value).length
    }));

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                <span className="ms-3 text-slate-400">טוען תגיות...</span>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                            <Tag className="w-8 h-8 text-amber-600" />
                            ניהול תגיות מתכונים
                        </h1>
                        <p className="text-slate-400 dark:text-slate-400 mt-1">
                            סך הכל: {tags.length} תגיות מוגדרות
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => { setEditingId(null); setShowModal(true); }}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            תגית חדשה
                        </button>
                        <button
                            onClick={() => setShowCategoryModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                        >
                            <Edit className="w-5 h-5" />
                            נהל קטגוריות
                        </button>
                    </div>
                </div>

                {/* Summary by category */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {tagsByCategory.map(cat => (
                        <div
                            key={cat.value}
                            className="bg-[#0d1424]/60 backdrop-blur-xl rounded-lg p-3 border border-white/10"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xl">{cat.icon}</span>
                                <span className="text-sm font-medium text-slate-300">
                                    {cat.label}
                                </span>
                            </div>
                            <div className="text-2xl font-bold text-amber-600">
                                {cat.count}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-xl shadow-2xl w-full max-w-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-[#0d1424]/60 backdrop-blur-xl border-b border-white/10 p-6 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                {editingId ? 'עריכת תגית' : 'תגית חדשה'}
                            </h2>
                            <button
                                onClick={resetForm}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">שם (אנגלית)</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                        required
                                        placeholder="chicken"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">שם (עברית)</label>
                                    <input
                                        type="text"
                                        value={formData.name_hebrew}
                                        onChange={e => setFormData({ ...formData, name_hebrew: e.target.value })}
                                        className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                        required
                                        placeholder="עוף"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">אייקון (אמוג'י)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={formData.icon}
                                            onChange={e => setFormData({ ...formData, icon: e.target.value })}
                                            className="flex-1 p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                            required
                                            placeholder="🍗"
                                        />
                                        {formData.icon && (
                                            <div className="flex items-center justify-center w-12 h-10 text-3xl bg-white/10 rounded-lg border dark:border-slate-600">
                                                {formData.icon}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">הדבק אמוג'י (emoji) או העתק מ-<a href="https://emojipedia.org" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">Emojipedia</a></p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">צבע</label>
                                    <input
                                        type="color"
                                        value={formData.color}
                                        onChange={e => setFormData({ ...formData, color: e.target.value })}
                                        className="w-full h-10 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-1">קטגוריה</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat.value} value={cat.value}>
                                                {cat.icon} {cat.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4 border-t border-white/10">
                                <button
                                    type="submit"
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    <Save className="w-4 h-4" />
                                    שמור
                                </button>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-4 py-2 bg-white/10 text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                >
                                    ביטול
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Filter */}
            <div className="mb-4">
                <select
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value)}
                    className="px-4 py-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                >
                    <option value="all">כל הקטגוריות</option>
                    {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>
                            {cat.icon} {cat.label} ({tagsByCategory.find(c => c.value === cat.value)?.count || 0})
                        </option>
                    ))}
                </select>
            </div>

            {/* Tags List */}
            <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-xl shadow-lg border border-white/10">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="px-4 py-3 text-start text-sm font-semibold">אייקון</th>
                                <th className="px-4 py-3 text-start text-sm font-semibold">שם עברית</th>
                                <th className="px-4 py-3 text-start text-sm font-semibold">שם אנגלית</th>
                                <th className="px-4 py-3 text-start text-sm font-semibold">קטגוריה</th>
                                <th className="px-4 py-3 text-start text-sm font-semibold">צבע</th>
                                <th className="px-4 py-3 text-start text-sm font-semibold">פעולות</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredTags.map(tag => {
                                const category = categories.find(c => c.value === (tag.category || 'general'));
                                return (
                                    <tr key={tag.id} className="hover:bg-white/5">
                                        <td className="px-4 py-3 text-2xl">{tag.icon}</td>
                                        <td className="px-4 py-3 font-medium">{tag.name_hebrew}</td>
                                        <td className="px-4 py-3 text-slate-400">{tag.name}</td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm">
                                                {category?.icon} {category?.label || tag.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-6 h-6 rounded border border-slate-300"
                                                    style={{ backgroundColor: tag.color }}
                                                />
                                                <span className="text-xs text-slate-400">{tag.color}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(tag)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                                                    title="ערוך"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(tag.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                                                    title="מחק"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Category Management Modal */}
            {showCategoryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-xl shadow-2xl w-full max-w-3xl border border-white/10 max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-[#0d1424]/60 backdrop-blur-xl border-b border-white/10 p-6 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Edit className="w-6 h-6 text-indigo-500" />
                                ניהול קטגוריות
                            </h2>
                            <button
                                onClick={() => setShowCategoryModal(false)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Add New Category */}
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                <h3 className="font-semibold text-slate-800 dark:text-white mb-3">קטגוריה חדשה</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <input
                                        type="text"
                                        placeholder="מזהה (אנגלית)"
                                        value={newCategory.value}
                                        onChange={e => setNewCategory({ ...newCategory, value: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                                        className="p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                    />
                                    <input
                                        type="text"
                                        placeholder="שם תצוגה (עברית)"
                                        value={newCategory.label}
                                        onChange={e => setNewCategory({ ...newCategory, label: e.target.value })}
                                        className="p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                        dir="rtl"
                                    />
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="🎯"
                                            value={newCategory.icon}
                                            onChange={e => setNewCategory({ ...newCategory, icon: e.target.value })}
                                            className="flex-1 p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 text-center text-2xl"
                                            maxLength={2}
                                        />
                                        <button
                                            onClick={handleAddCategory}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Existing Categories */}
                            <div>
                                <h3 className="font-semibold text-slate-800 dark:text-white mb-3">קטגוריות קיימות ({categories.length})</h3>
                                <div className="space-y-2">
                                    {categories.map(cat => {
                                        const tagCount = tags.filter(t => t.category === cat.value).length;
                                        return (
                                            <div
                                                key={cat.value}
                                                className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl">{cat.icon}</span>
                                                    <div>
                                                        <div className="font-medium text-slate-800 dark:text-white">{cat.label}</div>
                                                        <div className="text-xs text-slate-400">{cat.value}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm text-slate-400">
                                                        {tagCount} תגיות
                                                    </span>
                                                    <button
                                                        onClick={() => handleDeleteCategory(cat.value)}
                                                        disabled={tagCount > 0}
                                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                        title={tagCount > 0 ? 'לא ניתן למחוק - יש תגיות בקטגוריה' : 'מחק קטגוריה'}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminTagsPanel;
