// RecipeDetailPage Component
// Full recipe detail view with all information

import React, { useState, useEffect } from 'react';
import {
    ChevronRight, Clock, Users, ChefHat, Heart, Share2, Printer,
    Eye, Calendar, Tag, MessageCircle, Edit, Trash2, Check, Loader2,
    X, ChevronDown, ChevronUp, BookOpen, Sparkles, Play
} from 'lucide-react';
import { recipesService, Recipe, RecipeComment } from '../../services/recipesService';
import { useAuth } from '../../contexts/AuthContext';
import { CookingMode } from './CookingMode';
import { CategorizedTagsDisplay } from './CategorizedTagsDisplay';
import { SEOHead, buildRecipeJsonLd } from '../seo/SEOHead';

const DIFFICULTY_LABELS = {
    easy: { label: 'קל', color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
    medium: { label: 'בינוני', color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' },
    hard: { label: 'מאתגר', color: 'text-red-600 bg-red-100 dark:bg-red-900/30' }
};

interface RecipeDetailPageProps {
    recipeId: number;
    onClose: () => void;
}

export const RecipeDetailPage: React.FC<RecipeDetailPageProps> = ({ recipeId, onClose }) => {
    const { user } = useAuth();

    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
    const [servings, setServings] = useState(4);
    const [showComments, setShowComments] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);
    const [cookingMode, setCookingMode] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Load recipe data
    useEffect(() => {
        const loadRecipe = async () => {
            if (!recipeId) return;

            try {
                setLoading(true);
                setError(null);
                const data = await recipesService.getRecipe(recipeId);
                setRecipe(data);
                setServings(data.servings || 4);
                setLiked(data.likes?.userLiked || false);
                setLikeCount(data.likes?.count || data.like_count || 0);
            } catch (err: any) {
                console.error('Error loading recipe:', err);
                setError(err.message || 'שגיאה בטעינת המתכון');
            } finally {
                setLoading(false);
            }
        };

        loadRecipe();
    }, [recipeId]);

    // Toggle ingredient checkbox
    const toggleIngredient = (index: number) => {
        const newChecked = new Set(checkedIngredients);
        if (newChecked.has(index)) {
            newChecked.delete(index);
        } else {
            newChecked.add(index);
        }
        setCheckedIngredients(newChecked);
    };

    // Handle like
    const handleLike = async () => {
        if (!recipe) return;

        try {
            const result = await recipesService.toggleRecipeLike(recipe.id);
            setLiked(result.liked);
            setLikeCount(prev => result.liked ? prev + 1 : prev - 1);
        } catch (err) {
            console.error('Error toggling like:', err);
        }
    };

    // Handle comment submit
    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recipe || !newComment.trim()) return;

        try {
            setSubmittingComment(true);
            const comment = await recipesService.addRecipeComment(recipe.id, newComment.trim());

            // Add comment to local state
            setRecipe(prev => prev ? {
                ...prev,
                comments: [comment, ...(prev.comments || [])],
                comment_count: (prev.comment_count || 0) + 1
            } : null);

            setNewComment('');
        } catch (err) {
            console.error('Error adding comment:', err);
        } finally {
            setSubmittingComment(false);
        }
    };

    // Handle share
    const handleShare = async () => {
        if (!recipe) return;

        const url = window.location.href;
        const text = `${recipe.title} - מתכון מהמטבח הג'והורי`;

        if (navigator.share) {
            try {
                await navigator.share({ title: recipe.title, text, url });
            } catch (err) {
                console.log('Share cancelled');
            }
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(url);
            alert('הקישור הועתק ללוח!');
        }
    };

    // Handle print
    const handlePrint = () => {
        window.print();
    };

    // Handle delete
    const handleDelete = async () => {
        if (!recipe) return;

        try {
            setDeleting(true);
            await recipesService.deleteRecipe(recipe.id);
            onClose();
        } catch (err) {
            console.error('Error deleting recipe:', err);
            alert('שגיאה במחיקת המתכון');
        } finally {
            setDeleting(false);
        }
    };

    // Check if user can edit/delete
    const canEdit = user && recipe && (
        user.email === recipe.author_name ||
        user.role === 'admin'
    );

    // Calculate scaled ingredient amounts (basic implementation)
    const scaleIngredient = (ingredient: string, scale: number): string => {
        if (scale === 1) return ingredient;

        // Simple scaling - find numbers and multiply them
        return ingredient.replace(/(\d+\.?\d*)/g, (match) => {
            const num = parseFloat(match);
            const scaled = num * scale;
            return scaled % 1 === 0 ? scaled.toString() : scaled.toFixed(1);
        });
    };

    const servingScale = recipe ? servings / (recipe.servings || 4) : 1;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                <span className="mr-3 text-slate-400">טוען מתכון...</span>
            </div>
        );
    }

    if (error || !recipe) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-8">
                <ChefHat className="w-16 h-16 text-slate-300 mb-4" />
                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-300 mb-2">
                    המתכון לא נמצא
                </h2>
                <p className="text-slate-400 mb-6">{error || 'המתכון המבוקש אינו קיים'}</p>
                <button
                    onClick={() => onClose()}
                    className="px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                >
                    חזרה למתכונים
                </button>
            </div>
        );
    }

    const difficultyInfo = DIFFICULTY_LABELS[recipe.difficulty] || DIFFICULTY_LABELS.medium;
    const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);

    return (
        <div className="min-h-screen bg-white/5">
            <SEOHead
                title={`${recipe.title} - מתכון`}
                description={recipe.description || `מתכון מסורתי: ${recipe.title}`}
                canonicalPath={`/recipes/${recipe.id}`}
                ogType="article"
                jsonLd={buildRecipeJsonLd({
                    title: recipe.title,
                    description: recipe.description,
                    main_photo: recipe.main_photo,
                    author_name: recipe.author_name,
                    prep_time: recipe.prep_time,
                    cook_time: recipe.cook_time,
                    servings: recipe.servings,
                    ingredients: recipe.ingredients?.map((i: any) => i.name || i),
                    instructions: recipe.instructions,
                    avg_rating: recipe.avg_rating || undefined,
                    review_count: recipe.review_count || recipe.likes?.count,
                    tags: recipe.tags?.map((t: any) => t.name || t),
                })}
            />
            {/* Breadcrumb */}
            <div className="bg-[#0d1424]/60 backdrop-blur-xl border-b border-white/10 print:hidden">
                <div className="max-w-5xl mx-auto px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-400">
                        <button
                            onClick={() => onClose()}
                            className="hover:text-amber-600 dark:hover:text-amber-400"
                        >
                            מתכונים
                        </button>
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-slate-700 dark:text-slate-300">{recipe.title}</span>
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <div className="relative h-[60vh] min-h-[400px] bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20">
                {recipe.main_photo ? (
                    <img
                        src={recipe.main_photo}
                        alt={recipe.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <ChefHat className="w-32 h-32 text-amber-300 dark:text-amber-700" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                {/* Recipe Title Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-8">
                    <div className="max-w-5xl mx-auto">
                        <div className="flex flex-wrap gap-2 mb-4">
                            {recipe.is_featured && (
                                <span className="px-3 py-1 bg-amber-500 text-white text-sm font-bold rounded-full flex items-center gap-1">
                                    <Sparkles className="w-4 h-4" />
                                    מומלץ
                                </span>
                            )}
                            <span className={`px-3 py-1 text-sm font-medium rounded-full ${difficultyInfo.color}`}>
                                {difficultyInfo.label}
                            </span>
                            {recipe.region_name && (
                                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm rounded-full">
                                    {recipe.region_name}
                                </span>
                            )}
                        </div>

                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                            {recipe.title}
                        </h1>
                        {recipe.title_juhuri && (
                            <p className="text-xl md:text-2xl text-amber-300 font-medium mb-4">
                                {recipe.title_juhuri}
                            </p>
                        )}

                        {/* Meta Info */}
                        <div className="flex flex-wrap items-center gap-6 text-white/90">
                            {totalTime > 0 && (
                                <div className="flex items-center gap-2">
                                    <Clock className="w-5 h-5" />
                                    <span>{totalTime} דקות</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                <span>{recipe.servings} מנות</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Eye className="w-5 h-5" />
                                <span>{recipe.view_count} צפיות</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                <span>{new Date(recipe.created_at).toLocaleDateString('he-IL')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Description & Story */}
                        {(recipe.description || recipe.story) && (
                            <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-xl p-6 shadow-md border border-white/10">
                                {recipe.description && (
                                    <p className="text-slate-700 dark:text-slate-300 text-lg mb-4 leading-relaxed">
                                        {recipe.description}
                                    </p>
                                )}
                                {recipe.story && (
                                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border-r-4 border-amber-500">
                                        <div className="flex items-center gap-2 mb-2">
                                            <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                            <h3 className="font-bold text-amber-800 dark:text-amber-300">
                                                הסיפור מאחורי המתכון
                                            </h3>
                                        </div>
                                        <p className="text-amber-900 dark:text-amber-200/90 leading-relaxed italic">
                                            {recipe.story}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Instructions */}
                        <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-xl p-6 shadow-md border border-white/10">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                <ChefHat className="w-6 h-6 text-amber-600" />
                                אופן ההכנה
                            </h2>
                            <div className="space-y-4">
                                {recipe.instructions.map((instruction, index) => (
                                    <div key={index} className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold">
                                            {index + 1}
                                        </div>
                                        <p className="flex-1 text-slate-700 dark:text-slate-300 leading-relaxed pt-1">
                                            {instruction}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Comments Section */}
                        <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-xl p-6 shadow-md border border-white/10 print:hidden">
                            <button
                                onClick={() => setShowComments(!showComments)}
                                className="w-full flex items-center justify-between mb-4"
                            >
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <MessageCircle className="w-6 h-6 text-amber-600" />
                                    תגובות ({recipe.comment_count || 0})
                                </h2>
                                {showComments ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>

                            {showComments && (
                                <div className="space-y-4">
                                    {/* Add Comment Form */}
                                    {user && (
                                        <form onSubmit={handleCommentSubmit} className="mb-6">
                                            <textarea
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                placeholder="שתף את המחשבות שלך על המתכון..."
                                                className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-200 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:border-transparent"
                                                rows={3}
                                            />
                                            <button
                                                type="submit"
                                                disabled={!newComment.trim() || submittingComment}
                                                className="mt-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {submittingComment ? 'שולח...' : 'פרסם תגובה'}
                                            </button>
                                        </form>
                                    )}

                                    {/* Comments List */}
                                    {recipe.comments && recipe.comments.length > 0 ? (
                                        <div className="space-y-4">
                                            {recipe.comments.map((comment) => (
                                                <div key={comment.id} className="flex gap-3 p-4 bg-white/5 rounded-lg">
                                                    {comment.author_avatar ? (
                                                        <img
                                                            src={comment.author_avatar}
                                                            alt={comment.author_name}
                                                            className="w-10 h-10 rounded-full"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold">
                                                            {comment.author_name.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-medium text-slate-200">
                                                                {comment.author_name}
                                                            </span>
                                                            <span className="text-xs text-slate-400">
                                                                {new Date(comment.created_at).toLocaleDateString('he-IL')}
                                                            </span>
                                                        </div>
                                                        <p className="text-slate-700 dark:text-slate-300">
                                                            {comment.content}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-slate-400 text-center py-4">
                                            אין תגובות עדיין. היה הראשון להגיב!
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Sidebar */}
                    <div className="space-y-6">
                        {/* Action Buttons */}
                        <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-xl p-4 shadow-md border border-white/10 print:hidden sticky top-4">
                            {/* Cooking Mode Button */}
                            <button
                                onClick={() => setCookingMode(true)}
                                className="w-full mb-4 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30"
                            >
                                <Play className="w-5 h-5" />
                                מצב בישול
                            </button>

                            {/* Edit & Delete Buttons (for owner/admin) */}
                            {canEdit && (
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <button
                                        onClick={() => alert('עריכת מתכון תהיה זמינה בקרוב')}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Edit className="w-4 h-4" />
                                        ערוך
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        מחק
                                    </button>
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <button
                                    onClick={handleLike}
                                    className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
                                        liked
                                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                            : 'bg-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                                    }`}
                                >
                                    <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
                                    <span className="text-xs font-medium">{likeCount}</span>
                                </button>

                                <button
                                    onClick={handleShare}
                                    className="flex flex-col items-center gap-1 p-3 rounded-lg bg-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                                >
                                    <Share2 className="w-5 h-5" />
                                    <span className="text-xs font-medium">שתף</span>
                                </button>

                                <button
                                    onClick={handlePrint}
                                    className="flex flex-col items-center gap-1 p-3 rounded-lg bg-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                                >
                                    <Printer className="w-5 h-5" />
                                    <span className="text-xs font-medium">הדפס</span>
                                </button>
                            </div>

                            {/* Author Info */}
                            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                                {recipe.author_avatar ? (
                                    <img
                                        src={recipe.author_avatar}
                                        alt={recipe.author_name}
                                        className="w-12 h-12 rounded-full"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-lg font-bold">
                                        {recipe.author_name.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs text-slate-400 dark:text-slate-400">מחבר המתכון</p>
                                    <p className="font-medium text-slate-200">
                                        {recipe.author_name}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Ingredients */}
                        <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-xl p-6 shadow-md border border-white/10">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                    מרכיבים
                                </h2>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setServings(Math.max(1, servings - 1))}
                                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center"
                                    >
                                        -
                                    </button>
                                    <span className="w-12 text-center font-medium">
                                        {servings}
                                    </span>
                                    <button
                                        onClick={() => setServings(servings + 1)}
                                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {recipe.ingredients.map((ingredient, index) => (
                                    <label
                                        key={index}
                                        className="flex items-start gap-3 p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer group"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checkedIngredients.has(index)}
                                            onChange={() => toggleIngredient(index)}
                                            className="mt-1 w-5 h-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                                        />
                                        <span
                                            className={`flex-1 ${
                                                checkedIngredients.has(index)
                                                    ? 'line-through text-slate-400'
                                                    : 'text-slate-700 dark:text-slate-300'
                                            }`}
                                        >
                                            {scaleIngredient(ingredient, servingScale)}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Tags */}
                        {recipe.tags && recipe.tags.length > 0 && (
                            <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-xl p-6 shadow-md border border-white/10">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                    <Tag className="w-5 h-5 text-amber-600" />
                                    תגיות
                                </h3>
                                <CategorizedTagsDisplay tags={recipe.tags} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Cooking Mode */}
            {cookingMode && recipe && (
                <CookingMode
                    recipe={recipe}
                    servings={servings}
                    onClose={() => setCookingMode(false)}
                />
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                    מחיקת מתכון
                                </h2>
                                <p className="text-sm text-slate-400 dark:text-slate-400">
                                    פעולה זו אינה ניתנת לביטול
                                </p>
                            </div>
                        </div>

                        <p className="text-slate-700 dark:text-slate-300 mb-6">
                            האם אתה בטוח שברצונך למחוק את המתכון <strong>"{recipe?.title}"</strong>?
                            כל התמונות, התגובות והלייקים יימחקו לצמיתות.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={deleting}
                                className="flex-1 px-4 py-3 bg-white/10 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                            >
                                ביטול
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {deleting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        מוחק...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-5 h-5" />
                                        מחק לצמיתות
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecipeDetailPage;
