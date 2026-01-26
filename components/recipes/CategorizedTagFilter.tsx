// CategorizedTagFilter Component
// Multi-select tag filter organized by categories

import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { RecipeTag } from '../../services/recipesService';

interface CategorizedTagFilterProps {
    tags: RecipeTag[];
    selectedTags: number[];
    onTagToggle: (tagId: number) => void;
    onClearAll: () => void;
}

// Category display configuration
const CATEGORY_CONFIG: Record<string, { label: string; icon: string; order: number }> = {
    food_type: { label: 'סוג מאכל', icon: '🍽️', order: 1 },
    meal_type: { label: 'סוג ארוחה', icon: '🍴', order: 2 },
    ingredient_type: { label: 'מרכיב עיקרי', icon: '🥘', order: 3 },
    occasion: { label: 'אירוע/חג', icon: '🎉', order: 4 },
    difficulty: { label: 'רמת קושי', icon: '📊', order: 5 },
    origin: { label: 'מקור', icon: '🌍', order: 6 },
    cooking_method: { label: 'שיטת בישול', icon: '🔥', order: 7 },
    dietary: { label: 'תזונה מיוחדת', icon: '💚', order: 8 },
    season: { label: 'עונה', icon: '🌤️', order: 9 },
    general: { label: 'כללי', icon: '📌', order: 10 }
};

export const CategorizedTagFilter: React.FC<CategorizedTagFilterProps> = ({
    tags,
    selectedTags,
    onTagToggle,
    onClearAll
}) => {
    // Group tags by category
    const categorizedTags = useMemo(() => {
        const grouped: Record<string, RecipeTag[]> = {};

        tags.forEach(tag => {
            const category = tag.category || 'general';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(tag);
        });

        // Sort categories by order
        const sorted: [string, RecipeTag[]][] = Object.entries(grouped).sort((a, b) => {
            const orderA = CATEGORY_CONFIG[a[0]]?.order || 999;
            const orderB = CATEGORY_CONFIG[b[0]]?.order || 999;
            return orderA - orderB;
        });

        return sorted;
    }, [tags]);

    const selectedCount = selectedTags.length;

    return (
        <div className="space-y-4">
            {/* Header with clear button */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    סינון לפי תגיות
                    {selectedCount > 0 && (
                        <span className="mr-2 text-amber-600 dark:text-amber-400">
                            ({selectedCount} נבחרו)
                        </span>
                    )}
                </h3>
                {selectedCount > 0 && (
                    <button
                        onClick={onClearAll}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 transition-colors"
                    >
                        <X className="w-3 h-3" />
                        נקה הכל
                    </button>
                )}
            </div>

            {/* Categorized tags */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {categorizedTags.map(([category, categoryTags]) => {
                    const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.general;
                    return (
                        <div key={category} className="space-y-2">
                            {/* Category header */}
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                                <span>{config.icon}</span>
                                <span>{config.label}</span>
                            </div>

                            {/* Category tags */}
                            <div className="flex flex-wrap gap-2">
                                {categoryTags.map(tag => {
                                    const isSelected = selectedTags.includes(tag.id);
                                    return (
                                        <button
                                            key={tag.id}
                                            onClick={() => onTagToggle(tag.id)}
                                            className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                                                isSelected
                                                    ? 'bg-amber-500 text-white shadow-md scale-105'
                                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                                            }`}
                                        >
                                            <span className="ml-1">{tag.icon}</span>
                                            {tag.name_hebrew || tag.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CategorizedTagFilter;
