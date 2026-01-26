// RecipeCard Component
// Displays a single recipe in a card format

import React from 'react';
import { Heart, Clock, Users, ChefHat, Eye, MessageCircle } from 'lucide-react';
import { Recipe } from '../../services/recipesService';

interface RecipeCardProps {
    recipe: Recipe;
    onClick?: () => void;
    viewMode?: 'grid' | 'list';
}

const DIFFICULTY_LABELS = {
    easy: { label: 'קל', color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
    medium: { label: 'בינוני', color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' },
    hard: { label: 'מאתגר', color: 'text-red-600 bg-red-100 dark:bg-red-900/30' }
};

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onClick, viewMode = 'grid' }) => {
    const difficultyInfo = DIFFICULTY_LABELS[recipe.difficulty] || DIFFICULTY_LABELS.medium;
    const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);

    // Grid view (vertical card)
    if (viewMode === 'grid') {
        return (
            <div
                onClick={onClick}
                className="group bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-600"
            >
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20">
                    {recipe.main_photo ? (
                        <img
                            src={recipe.main_photo}
                            alt={recipe.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <ChefHat className="w-16 h-16 text-amber-300 dark:text-amber-700" />
                        </div>
                    )}

                    {/* Overlay badges - show only 2 primary tags */}
                    <div className="absolute top-3 left-3 flex gap-2">
                        {recipe.is_featured && (
                            <span className="px-2 py-1 bg-amber-500 text-white text-xs font-bold rounded-full">
                                מומלץ
                            </span>
                        )}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${difficultyInfo.color}`}>
                            {difficultyInfo.label}
                        </span>
                    </div>

                    {/* Region badge - as secondary tag */}
                    {recipe.region_name && (
                        <div className="absolute bottom-3 right-3">
                            <span className="px-2 py-1 bg-black/50 backdrop-blur-sm text-white text-xs rounded-full">
                                {recipe.region_name}
                            </span>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-4">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-1 line-clamp-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {recipe.title}
                    </h3>

                    {recipe.title_juhuri && (
                        <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mb-2">
                            {recipe.title_juhuri}
                        </p>
                    )}

                    {recipe.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                            {recipe.description}
                        </p>
                    )}

                    {/* Meta info */}
                    <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                        {totalTime > 0 && (
                            <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {totalTime} דק׳
                            </span>
                        )}
                        {recipe.servings && (
                            <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                {recipe.servings} מנות
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            {recipe.view_count || 0}
                        </span>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                            {recipe.author_avatar ? (
                                <img
                                    src={recipe.author_avatar}
                                    alt={recipe.author_name}
                                    className="w-6 h-6 rounded-full"
                                />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                                    {recipe.author_name?.charAt(0)}
                                </div>
                            )}
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                {recipe.author_name}
                            </span>
                        </div>

                        <div className="flex items-center gap-3 text-slate-400">
                            <span className="flex items-center gap-1 text-sm">
                                <Heart className="w-4 h-4" />
                                {recipe.like_count || 0}
                            </span>
                            <span className="flex items-center gap-1 text-sm">
                                <MessageCircle className="w-4 h-4" />
                                {recipe.comment_count || 0}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // List view (horizontal card)
    return (
        <div
            onClick={onClick}
            className="group bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-600 flex flex-col md:flex-row"
        >
            {/* Image - fixed width on desktop */}
            <div className="relative w-full md:w-64 lg:w-80 aspect-[4/3] md:aspect-auto md:h-48 flex-shrink-0 overflow-hidden bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20">
                {recipe.main_photo ? (
                    <img
                        src={recipe.main_photo}
                        alt={recipe.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <ChefHat className="w-16 h-16 text-amber-300 dark:text-amber-700" />
                    </div>
                )}

                {/* Overlay badges - show only 2 primary tags */}
                <div className="absolute top-3 left-3 flex gap-2">
                    {recipe.is_featured && (
                        <span className="px-2 py-1 bg-amber-500 text-white text-xs font-bold rounded-full">
                            מומלץ
                        </span>
                    )}
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${difficultyInfo.color}`}>
                        {difficultyInfo.label}
                    </span>
                </div>
            </div>

            {/* Content - flexible width */}
            <div className="flex-1 p-4 md:p-6 flex flex-col justify-between">
                <div>
                    <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                            <h3 className="font-bold text-xl md:text-2xl text-slate-800 dark:text-slate-100 mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                {recipe.title}
                            </h3>
                            {recipe.title_juhuri && (
                                <p className="text-base text-amber-600 dark:text-amber-400 font-medium">
                                    {recipe.title_juhuri}
                                </p>
                            )}
                        </div>

                        {recipe.region_name && (
                            <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-sm rounded-full flex-shrink-0">
                                {recipe.region_name}
                            </span>
                        )}
                    </div>

                    {recipe.description && (
                        <p className="text-base text-slate-600 dark:text-slate-300 line-clamp-2 mb-4">
                            {recipe.description}
                        </p>
                    )}

                    {/* Meta info */}
                    <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
                        {totalTime > 0 && (
                            <span className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4" />
                                {totalTime} דקות
                            </span>
                        )}
                        {recipe.servings && (
                            <span className="flex items-center gap-1.5">
                                <Users className="w-4 h-4" />
                                {recipe.servings} מנות
                            </span>
                        )}
                        <span className="flex items-center gap-1.5">
                            <Eye className="w-4 h-4" />
                            {recipe.view_count || 0} צפיות
                        </span>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        {recipe.author_avatar ? (
                            <img
                                src={recipe.author_avatar}
                                alt={recipe.author_name}
                                className="w-8 h-8 rounded-full"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold">
                                {recipe.author_name?.charAt(0)}
                            </div>
                        )}
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {recipe.author_name}
                        </span>
                    </div>

                    <div className="flex items-center gap-4 text-slate-400">
                        <span className="flex items-center gap-1.5 text-base">
                            <Heart className="w-5 h-5" />
                            {recipe.like_count || 0}
                        </span>
                        <span className="flex items-center gap-1.5 text-base">
                            <MessageCircle className="w-5 h-5" />
                            {recipe.comment_count || 0}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecipeCard;
