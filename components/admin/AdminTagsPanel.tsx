// AdminTagsPanel Component
// Admin interface for managing recipe tags

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Tag, Loader2 } from 'lucide-react';
import { RecipeTag } from '../../services/recipesService';
import apiService from '../../services/apiService';

// Category options
const CATEGORIES = [
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

export const AdminTagsPanel: React.FC = () => {
    const [tags, setTags] = useState<RecipeTag[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [filterCategory, setFilterCategory] = useState<string>('all');

    const [formData, setFormData] = useState<TagFormData>({
        name: '',
        name_hebrew: '',
        icon: '',
        color: '#F59E0B',
        category: 'general'
    });

    useEffect(() => {
        loadTags();
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
        setShowAddForm(true);
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

    const resetForm = () => {
        setFormData({
            name: '',
            name_hebrew: '',
            icon: '',
            color: '#F59E0B',
            category: 'general'
        });
        setEditingId(null);
        setShowAddForm(false);
    };

    const filteredTags = filterCategory === 'all'
        ? tags
        : tags.filter(tag => (tag.category || 'general') === filterCategory);

    const tagsByCategory = CATEGORIES.map(cat => ({
        ...cat,
        tags: tags.filter(tag => (tag.category || 'general') === cat.value),
        count: tags.filter(tag => (tag.category || 'general') === cat.value).length
    }));

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                <span className="mr-3 text-slate-500">טוען תגיות...</span>
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
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            סך הכל: {tags.length} תגיות מוגדרות
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                    >
                        {showAddForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        {showAddForm ? 'ביטול' : 'תגית חדשה'}
                    </button>
                </div>

                {/* Summary by category */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {tagsByCategory.map(cat => (
                        <div
                            key={cat.value}
                            className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xl">{cat.icon}</span>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
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

            {/* Add/Edit Form */}
            {showAddForm && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700 mb-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
                        {editingId ? 'עריכת תגית' : 'תגית חדשה'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
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
                                <input
                                    type="text"
                                    value={formData.icon}
                                    onChange={e => setFormData({ ...formData, icon: e.target.value })}
                                    className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                    required
                                    placeholder="🍗"
                                />
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
                                    {CATEGORIES.map(cat => (
                                        <option key={cat.value} value={cat.value}>
                                            {cat.icon} {cat.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <Save className="w-4 h-4" />
                                שמור
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                            >
                                ביטול
                            </button>
                        </div>
                    </form>
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
                    {CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>
                            {cat.icon} {cat.label} ({tagsByCategory.find(c => c.value === cat.value)?.count || 0})
                        </option>
                    ))}
                </select>
            </div>

            {/* Tags List */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-4 py-3 text-right text-sm font-semibold">אייקון</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold">שם עברית</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold">שם אנגלית</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold">קטגוריה</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold">צבע</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold">פעולות</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredTags.map(tag => {
                                const category = CATEGORIES.find(c => c.value === (tag.category || 'general'));
                                return (
                                    <tr key={tag.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <td className="px-4 py-3 text-2xl">{tag.icon}</td>
                                        <td className="px-4 py-3 font-medium">{tag.name_hebrew}</td>
                                        <td className="px-4 py-3 text-slate-500">{tag.name}</td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm">
                                                {category?.icon} {category?.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-6 h-6 rounded border border-slate-300"
                                                    style={{ backgroundColor: tag.color }}
                                                />
                                                <span className="text-xs text-slate-500">{tag.color}</span>
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
        </div>
    );
};

export default AdminTagsPanel;
