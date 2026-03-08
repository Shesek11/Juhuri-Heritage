// CategorizedTagFilter Component
// Compact multi-select tag filter organized by categories

import React, { useMemo, useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { RecipeTag } from '../../services/recipesService';

interface CategorizedTagFilterProps {
    tags: RecipeTag[];
    selectedTags: number[];
    onTagToggle: (tagId: number) => void;
    onClearAll: () => void;
}

// Category display configuration
const CATEGORY_CONFIG: Record<string, { label: string; icon: string; order: number }> = {
    occasion: { label: 'אירועים וחגים', icon: '🎉', order: 1 },
    food_type: { label: 'סוג מאכל', icon: '🍽️', order: 2 },
    ingredient_type: { label: 'מרכיב עיקרי', icon: '🥘', order: 3 },
    origin: { label: 'מקור', icon: '🌍', order: 4 },
    difficulty: { label: 'רמת קושי', icon: '📊', order: 5 },
    meal_type: { label: 'סוג ארוחה', icon: '🍴', order: 6 },
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
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
        new Set(['occasion', 'food_type', 'ingredient_type']) // Default expanded
    );

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

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(category)) {
                newSet.delete(category);
            } else {
                newSet.add(category);
            }
            return newSet;
        });
    };

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    סינון לפי תגיות
                    {selectedCount > 0 && (
                        <span className="mr-2 text-amber-600 dark:text-amber-400 font-normal">
                            ({selectedCount})
                        </span>
                    )}
                </h3>
                {selectedCount > 0 && (
                    <button
                        onClick={onClearAll}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 transition-colors"
                    >
                        <X className="w-3 h-3" />
                        נקה
                    </button>
                )}
            </div>

            {/* Categorized tags */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {categorizedTags.map(([category, categoryTags]) => {
                    const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.general;
                    const isExpanded = expandedCategories.has(category);
                    const categorySelectedCount = categoryTags.filter(tag =>
                        selectedTags.includes(tag.id)
                    ).length;

                    return (
                        <div key={category} className="border-b border-white/10 last:border-0 pb-2">
                            {/* Category header - clickable */}
                            <button
                                onClick={() => toggleCategory(category)}
                                className="flex items-center justify-between w-full text-right hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded p-1.5 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-base">{config.icon}</span>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        {config.label}
                                    </span>
                                    {categorySelectedCount > 0 && (
                                        <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                                            {categorySelectedCount}
                                        </span>
                                    )}
                                </div>
                                {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-slate-400" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                )}
                            </button>

                            {/* Category tags - collapsible */}
                            {isExpanded && (
                                <div className="flex flex-wrap gap-1.5 mt-2 pr-6">
                                    {categoryTags.map(tag => {
                                        const isSelected = selectedTags.includes(tag.id);
                                        return (
                                            <button
                                                key={tag.id}
                                                onClick={() => onTagToggle(tag.id)}
                                                className={`px-2.5 py-1 rounded-full text-xs transition-all ${
                                                    isSelected
                                                        ? 'bg-amber-500 text-white shadow-sm'
                                                        : 'bg-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                                                }`}
                                                title={tag.name}
                                            >
                                                {tag.name_hebrew || tag.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CategorizedTagFilter;
