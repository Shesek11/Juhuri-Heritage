// CategorizedTagsDisplay Component
// Display recipe tags organized by categories (read-only)

import React, { useMemo } from 'react';
import { RecipeTag } from '../../services/recipesService';

interface CategorizedTagsDisplayProps {
    tags: RecipeTag[];
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

export const CategorizedTagsDisplay: React.FC<CategorizedTagsDisplayProps> = ({ tags }) => {
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
        const sorted: [string, RecipeTag[]][] = Object.entries(grouped)
            .sort((a, b) => {
                const orderA = CATEGORY_CONFIG[a[0]]?.order || 999;
                const orderB = CATEGORY_CONFIG[b[0]]?.order || 999;
                return orderA - orderB;
            })
            .filter(([_, categoryTags]) => categoryTags.length > 0); // Only show categories with tags

        return sorted;
    }, [tags]);

    if (categorizedTags.length === 0) return null;

    return (
        <div className="space-y-3">
            {categorizedTags.map(([category, categoryTags]) => {
                const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.general;
                return (
                    <div key={category}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-base">{config.icon}</span>
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                {config.label}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {categoryTags.map(tag => (
                                <span
                                    key={tag.id}
                                    className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm rounded-full border border-amber-200 dark:border-amber-800"
                                >
                                    {tag.name_hebrew || tag.name}
                                </span>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default CategorizedTagsDisplay;
