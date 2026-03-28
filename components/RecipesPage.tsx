'use client';

// RecipesPage Component
// Main page for browsing recipes

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/src/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Search, ChefHat, Plus, Filter, Grid, List, Loader2, RefreshCw } from 'lucide-react';
import { recipesService, Recipe, RecipeTag, RecipesResponse } from '../services/recipesService';
import { RecipeCard } from './recipes/RecipeCard';
import { RecipeWizard } from './recipes/RecipeWizard';
import { RecipeDetailPage } from './recipes/RecipeDetailPage';
import { CategorizedTagFilter } from './recipes/CategorizedTagFilter';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { SEOHead } from './seo/SEOHead';

type SortOption = 'newest' | 'popular' | 'likes' | 'oldest';
type ViewMode = 'grid' | 'list';

export const RecipesPage: React.FC = () => {
    const t = useTranslations('recipes');
    const params = useParams();
    const routeRecipeId = params?.id as string | undefined;
    const router = useRouter();
    const selectedRecipeId = routeRecipeId ? Number(routeRecipeId) : null;
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [tags, setTags] = useState<RecipeTag[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [selectedTags, setSelectedTags] = useState<number[]>([]);
    const [sort, setSort] = useState<SortOption>('newest');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [showFilters, setShowFilters] = useState(false);
    const [isWizardOpen, setIsWizardOpen] = useState(false);

    const { isEnabled: recipesEnabled } = useFeatureFlag('recipes_module');

    const loadRecipes = async (page = 1) => {
        try {
            setLoading(true);
            setError(null);

            const response: RecipesResponse = await recipesService.getRecipes({
                search: search || undefined,
                tags: selectedTags.length > 0 ? selectedTags : undefined,
                sort,
                page,
                limit: 12
            });

            setRecipes(response.recipes);
            setPagination(response.pagination);
        } catch (err) {
            console.error('Error loading recipes:', err);
            setError(t('loadError'));
        } finally {
            setLoading(false);
        }
    };

    const loadTags = async () => {
        try {
            const tagsData = await recipesService.getRecipeTags();
            setTags(tagsData);
        } catch (err) {
            console.error('Error loading tags:', err);
        }
    };

    useEffect(() => {
        loadTags();
    }, []);

    useEffect(() => {
        loadRecipes(1);
    }, [selectedTags, sort]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        loadRecipes(1);
    };

    const handleRecipeClick = (recipe: Recipe) => {
        router.push(`/recipes/${recipe.id}`);
    };

    const handleTagToggle = (tagId: number) => {
        setSelectedTags(prev => {
            if (prev.includes(tagId)) {
                return prev.filter(id => id !== tagId);
            } else {
                return [...prev, tagId];
            }
        });
    };

    const handleClearAllTags = () => {
        setSelectedTags([]);
    };

    // Conditional returns after all hooks
    if (!recipesEnabled) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <ChefHat className="w-16 h-16 text-amber-300 mb-4" />
                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-300 mb-2">
                    {t('devMode')}
                </h2>
                <p className="text-slate-400 dark:text-slate-400">
                    {t('devModeDesc')}
                </p>
            </div>
        );
    }

    // If a recipe is selected (via URL param), show the detail page
    if (selectedRecipeId) {
        return (
            <RecipeDetailPage
                recipeId={selectedRecipeId}
                onClose={() => router.push('/recipes')}
            />
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <SEOHead
                title={t('heading')}
                description={t('description')}
                canonicalPath="/recipes"
            />
            {/* Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-sm font-medium mb-4">
                    <ChefHat className="w-4 h-4" />
                    {t('badge')}
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white mb-3">
                    {t('heading')}
                </h1>
                <p className="text-slate-400 dark:text-slate-400 max-w-2xl mx-auto">
                    {t('description')}
                </p>
            </div>

            {/* Search & Filters */}
            <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-xl p-4 shadow-md border border-white/10 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <form onSubmit={handleSearch} className="flex-1">
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('searchPlaceholder')}
                                className="w-full ps-10 pe-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-200 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:border-transparent"
                            />
                        </div>
                    </form>

                    {/* Controls */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${showFilters
                                ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-400 text-amber-700 dark:text-amber-300'
                                : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-white/10'
                                }`}
                        >
                            <Filter className="w-4 h-4" />
                            {t('filter')}
                        </button>

                        <select
                            value={sort}
                            onChange={(e) => setSort(e.target.value as SortOption)}
                            className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        >
                            <option value="newest">{t('sortNewest')}</option>
                            <option value="popular">{t('sortPopular')}</option>
                            <option value="likes">{t('sortFavorite')}</option>
                            <option value="oldest">{t('sortOldest')}</option>
                        </select>

                        <div className="flex border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2.5 ${viewMode === 'grid' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'text-slate-400 hover:bg-white/10'}`}
                            >
                                <Grid className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2.5 ${viewMode === 'list' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'text-slate-400 hover:bg-white/10'}`}
                            >
                                <List className="w-5 h-5" />
                            </button>
                        </div>

                        <button
                            onClick={() => loadRecipes(pagination.page)}
                            className="p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-white/10"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Tag Filters */}
                {showFilters && tags.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                        <CategorizedTagFilter
                            tags={tags}
                            selectedTags={selectedTags}
                            onTagToggle={handleTagToggle}
                            onClearAll={handleClearAllTags}
                        />
                    </div>
                )}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                    <span className="ms-3 text-slate-400">{t('loading')}</span>
                </div>
            ) : error ? (
                <div className="text-center py-16">
                    <p className="text-red-500 mb-4">{error}</p>
                    <button
                        onClick={() => loadRecipes(1)}
                        className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                    >
                        {t('tryAgain')}
                    </button>
                </div>
            ) : recipes.length === 0 ? (
                <div className="text-center py-16">
                    <ChefHat className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-slate-600 dark:text-slate-400 mb-2">
                        {t('noResults')}
                    </h3>
                    <p className="text-slate-400 dark:text-slate-400 mb-6">
                        {t('noResultsHint')}
                    </p>
                    <button
                        onClick={() => setIsWizardOpen(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        {t('addRecipe')}
                    </button>
                </div>
            ) : (
                <>
                    {/* Recipe Grid */}
                    <div className={
                        viewMode === 'grid'
                            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                            : 'flex flex-col gap-4'
                    }>
                        {recipes.map(recipe => (
                            <RecipeCard
                                key={recipe.id}
                                recipe={recipe}
                                onClick={() => handleRecipeClick(recipe)}
                                viewMode={viewMode}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="flex justify-center gap-2 mt-8">
                            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => loadRecipes(page)}
                                    className={`w-10 h-10 rounded-lg font-medium transition-colors ${page === pagination.page
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Floating Add Button */}
            <button
                onClick={() => setIsWizardOpen(true)}
                className="fixed bottom-6 left-6 w-14 h-14 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-110 z-50"
            >
                <Plus className="w-6 h-6" />
            </button>

            <RecipeWizard
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                onSuccess={() => loadRecipes(1)}
                availableTags={tags}
            />
        </div>
    );
};

export default RecipesPage;
