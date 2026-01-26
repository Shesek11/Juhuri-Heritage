// RecipeDetailPage Component
// Full recipe detail view with all information

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronRight, Clock, Users, ChefHat, Heart, Share2, Printer,
    Eye, Calendar, Tag, MessageCircle, Edit, Trash2, Check, Loader2,
    X, ChevronDown, ChevronUp, BookOpen, Sparkles
} from 'lucide-react';
import { recipesService, Recipe, RecipeComment } from '../../services/recipesService';
import { useAuth0 } from '@auth0/auth0-react';

const DIFFICULTY_LABELS = {
    easy: { label: 'קל', color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
    medium: { label: 'בינוני', color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' },
    hard: { label: 'מאתגר', color: 'text-red-600 bg-red-100 dark:bg-red-900/30' }
};

export const RecipeDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth0();

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

    // Load recipe data
    useEffect(() => {
        const loadRecipe = async () => {
            if (!id) return;

            try {
                setLoading(true);
                setError(null);
                const data = await recipesService.getRecipe(parseInt(id));
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
    }, [id]);

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
                <span className="mr-3 text-slate-500">טוען מתכון...</span>
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
                <p className="text-slate-500 mb-6">{error || 'המתכון המבוקש אינו קיים'}</p>
                <button
                    onClick={() => navigate('/recipes')}
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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            {/* Breadcrumb */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 print:hidden">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <button
                            onClick={() => navigate('/recipes')}
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
                    <div className="max-w-7xl mx-auto">
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
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Description & Story */}
                        {(recipe.description || recipe.story) && (
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-md border border-slate-200 dark:border-slate-700">
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
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-md border border-slate-200 dark:border-slate-700">
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
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-md border border-slate-200 dark:border-slate-700 print:hidden">
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
                                                className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                                                <div key={comment.id} className="flex gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
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
                                                            <span className="font-medium text-slate-800 dark:text-slate-200">
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
                                        <p className="text-slate-500 text-center py-4">
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
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-md border border-slate-200 dark:border-slate-700 print:hidden sticky top-4">
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <button
                                    onClick={handleLike}
                                    className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
                                        liked
                                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                                    }`}
                                >
                                    <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
                                    <span className="text-xs font-medium">{likeCount}</span>
                                </button>

                                <button
                                    onClick={handleShare}
                                    className="flex flex-col items-center gap-1 p-3 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                                >
                                    <Share2 className="w-5 h-5" />
                                    <span className="text-xs font-medium">שתף</span>
                                </button>

                                <button
                                    onClick={handlePrint}
                                    className="flex flex-col items-center gap-1 p-3 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                                >
                                    <Printer className="w-5 h-5" />
                                    <span className="text-xs font-medium">הדפס</span>
                                </button>
                            </div>

                            {/* Author Info */}
                            <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
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
                                    <p className="text-xs text-slate-500 dark:text-slate-400">מחבר המתכון</p>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {recipe.author_name}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Ingredients */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-md border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                    מרכיבים
                                </h2>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setServings(Math.max(1, servings - 1))}
                                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center"
                                    >
                                        -
                                    </button>
                                    <span className="w-12 text-center font-medium">
                                        {servings}
                                    </span>
                                    <button
                                        onClick={() => setServings(servings + 1)}
                                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center"
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
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-md border border-slate-200 dark:border-slate-700">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                                    <Tag className="w-5 h-5 text-amber-600" />
                                    תגיות
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {recipe.tags.map((tag) => (
                                        <span
                                            key={tag.id}
                                            className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded-full"
                                        >
                                            {tag.name_hebrew || tag.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecipeDetailPage;
