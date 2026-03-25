// RecipeWizard Component
// Multi-step modal for adding a new recipe

import React, { useState, useRef } from 'react';
import { X, ChefHat, Upload, Camera, Sparkles, ChevronLeft, ChevronRight, Check, Trash2, Image as ImageIcon, Plus } from 'lucide-react';
import { RecipeInput, recipesService, RecipeTag } from '../../services/recipesService';
import { uploadService } from '../../services/uploadService';
import { useAuth } from '../../contexts/AuthContext';
import { CategorizedTagFilter } from './CategorizedTagFilter';

interface RecipeWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    availableTags: RecipeTag[];
}

type Step = 'basics' | 'ingredients' | 'instructions' | 'photos' | 'review';

export const RecipeWizard: React.FC<RecipeWizardProps> = ({ isOpen, onClose, onSuccess, availableTags }) => {
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentStep, setCurrentStep] = useState<Step>('basics');
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [uploadingPhotos, setUploadingPhotos] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);

    // Form State
    const [formData, setFormData] = useState<RecipeInput>({
        title: '',
        title_juhuri: '',
        description: '',
        story: '',
        ingredients: [''],
        instructions: [''],
        prep_time: 0,
        cook_time: 0,
        servings: 4,
        difficulty: 'medium',
        tags: []
    });

    if (!isOpen) return null;

    // Handlers
    const updateField = (field: keyof RecipeInput, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleNext = () => {
        switch (currentStep) {
            case 'basics': setCurrentStep('ingredients'); break;
            case 'ingredients': setCurrentStep('instructions'); break;
            case 'instructions': setCurrentStep('photos'); break;
            case 'photos': setCurrentStep('review'); break;
        }
    };

    const handleBack = () => {
        switch (currentStep) {
            case 'ingredients': setCurrentStep('basics'); break;
            case 'instructions': setCurrentStep('ingredients'); break;
            case 'photos': setCurrentStep('instructions'); break;
            case 'review': setCurrentStep('photos'); break;
        }
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            setError(null);

            // Clean up arrays
            const cleanData = {
                ...formData,
                ingredients: formData.ingredients.filter(i => i.trim()),
                instructions: formData.instructions.filter(i => i.trim())
            };

            if (cleanData.ingredients.length === 0 || cleanData.instructions.length === 0) {
                throw new Error('יש להזין לפחות מרכיב אחד והוראה אחת');
            }

            // Create recipe
            const result = await recipesService.createRecipe(cleanData);
            const recipeId = result.recipe_id;

            // Upload photos if any
            if (photos.length > 0) {
                setUploadingPhotos(true);
                for (let i = 0; i < photos.length; i++) {
                    try {
                        // Upload file
                        const uploadResult = await uploadService.uploadFile(photos[i].file);
                        // Add photo to recipe (first photo is main)
                        await uploadService.addRecipePhoto(recipeId, uploadResult.url, i === 0);
                    } catch (photoErr) {
                        console.error('Error uploading photo:', photoErr);
                        // Continue with other photos even if one fails
                    }
                }
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'שגיאה בשמירת המתכון');
        } finally {
            setLoading(false);
            setUploadingPhotos(false);
        }
    };

    const addIngredient = () => {
        setFormData(prev => ({ ...prev, ingredients: [...prev.ingredients, ''] }));
    };

    const updateIngredient = (index: number, value: string) => {
        const newIngredients = [...formData.ingredients];
        newIngredients[index] = value;
        setFormData(prev => ({ ...prev, ingredients: newIngredients }));
    };

    const addInstruction = () => {
        setFormData(prev => ({ ...prev, instructions: [...prev.instructions, ''] }));
    };

    const updateInstruction = (index: number, value: string) => {
        const newInstructions = [...formData.instructions];
        newInstructions[index] = value;
        setFormData(prev => ({ ...prev, instructions: newInstructions }));
    };

    const toggleTag = (tagId: number) => {
        setFormData(prev => {
            const currentTags = prev.tags || [];
            if (currentTags.includes(tagId)) {
                return { ...prev, tags: currentTags.filter(id => id !== tagId) };
            } else {
                return { ...prev, tags: [...currentTags, tagId] };
            }
        });
    };

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newPhotos: { file: File; preview: string }[] = [];
        Array.from(files).forEach(file => {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                setError('ניתן להעלות קבצי תמונה בלבד');
                return;
            }

            // Validate file size (max 15MB)
            if (file.size > 15 * 1024 * 1024) {
                setError('גודל הקובץ חייב להיות פחות מ-15MB');
                return;
            }

            // Create preview
            const preview = URL.createObjectURL(file);
            newPhotos.push({ file, preview });
        });

        setPhotos(prev => [...prev, ...newPhotos]);
        setError(null);
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => {
            // Revoke object URL to free memory
            URL.revokeObjectURL(prev[index].preview);
            return prev.filter((_, i) => i !== index);
        });
    };

    // Steps Rendering
    const renderStepContent = () => {
        switch (currentStep) {
            case 'basics':
                return (
                    <div className="space-y-4 animate-in slide-in-from-right">
                        <div>
                            <label className="block text-sm font-medium mb-1">שם המתכון</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={e => updateField('title', e.target.value)}
                                className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                placeholder="למשל: דושפרה"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">שם בג'והורי (אופציונלי)</label>
                            <input
                                type="text"
                                value={formData.title_juhuri}
                                onChange={e => updateField('title_juhuri', e.target.value)}
                                className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                placeholder="שם בשפת המקור"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">תיאור קצר</label>
                            <textarea
                                value={formData.description}
                                onChange={e => updateField('description', e.target.value)}
                                className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                rows={2}
                                placeholder="תיאור מגרה של המנה..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">זמן הכנה (דקות)</label>
                                <input
                                    type="number"
                                    value={formData.prep_time}
                                    onChange={e => updateField('prep_time', parseInt(e.target.value))}
                                    className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">זמן בישול (דקות)</label>
                                <input
                                    type="number"
                                    value={formData.cook_time}
                                    onChange={e => updateField('cook_time', parseInt(e.target.value))}
                                    className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">מספר מנות</label>
                                <input
                                    type="number"
                                    value={formData.servings}
                                    onChange={e => updateField('servings', parseInt(e.target.value))}
                                    className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">רמת קושי</label>
                                <select
                                    value={formData.difficulty}
                                    onChange={e => updateField('difficulty', e.target.value)}
                                    className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                >
                                    <option value="easy">קל</option>
                                    <option value="medium">בינוני</option>
                                    <option value="hard">מאתגר</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">תגיות</label>
                            <div className="bg-white/5/50 rounded-lg p-3 border border-white/10">
                                <CategorizedTagFilter
                                    tags={availableTags}
                                    selectedTags={formData.tags || []}
                                    onTagToggle={toggleTag}
                                    onClearAll={() => setFormData(prev => ({ ...prev, tags: [] }))}
                                />
                            </div>
                        </div>
                    </div>
                );

            case 'ingredients':
                return (
                    <div className="space-y-4 animate-in slide-in-from-right">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-medium">מרכיבים</h3>
                            <button onClick={addIngredient} className="text-amber-600 text-sm font-bold flex items-center gap-1">
                                <Plus size={16} /> הוסף שורה
                            </button>
                        </div>
                        {formData.ingredients.map((ing, idx) => (
                            <div key={idx} className="flex gap-2">
                                <span className="mt-2 text-slate-400 text-xs w-4">{idx + 1}.</span>
                                <input
                                    type="text"
                                    value={ing}
                                    onChange={e => updateIngredient(idx, e.target.value)}
                                    className="flex-1 p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                    placeholder="למשל: 2 כוסות קמח"
                                    autoFocus={idx === formData.ingredients.length - 1}
                                />
                            </div>
                        ))}
                    </div>
                );

            case 'instructions':
                return (
                    <div className="space-y-4 animate-in slide-in-from-right">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-medium">הוראות הכנה</h3>
                            <button onClick={addInstruction} className="text-amber-600 text-sm font-bold flex items-center gap-1">
                                <Plus size={16} /> הוסף שלב
                            </button>
                        </div>
                        {formData.instructions.map((inst, idx) => (
                            <div key={idx} className="flex gap-2">
                                <span className="mt-2 text-slate-400 text-xs w-4">{idx + 1}.</span>
                                <textarea
                                    value={inst}
                                    onChange={e => updateInstruction(idx, e.target.value)}
                                    className="flex-1 p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                    placeholder="תאר את פעולת ההכנה..."
                                    rows={2}
                                    autoFocus={idx === formData.instructions.length - 1}
                                />
                            </div>
                        ))}
                    </div>
                );

            case 'photos':
                return (
                    <div className="space-y-4 animate-in slide-in-from-right">
                        <div className="text-center mb-4">
                            <h3 className="text-lg font-medium mb-2">העלאת תמונות</h3>
                            <p className="text-sm text-slate-400 dark:text-slate-400">
                                הוסף תמונות יפות של המנה שלך (עד 15MB לתמונה)
                            </p>
                        </div>

                        {/* Upload Area */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all"
                        >
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                                    <Upload className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-slate-700 dark:text-slate-300 font-medium mb-1">
                                        לחץ לבחירת תמונות
                                    </p>
                                    <p className="text-sm text-slate-400 dark:text-slate-400">
                                        או גרור קבצים לכאן
                                    </p>
                                </div>
                                <p className="text-xs text-slate-400">
                                    PNG, JPG, WEBP עד 15MB
                                </p>
                            </div>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handlePhotoSelect}
                            className="hidden"
                        />

                        {/* Photo Previews */}
                        {photos.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                                {photos.map((photo, index) => (
                                    <div key={index} className="relative group">
                                        <img
                                            src={photo.preview}
                                            alt={`תצוגה מקדימה ${index + 1}`}
                                            className="w-full h-32 object-cover rounded-lg border-2 border-white/10"
                                        />
                                        {index === 0 && (
                                            <div className="absolute top-2 left-2 px-2 py-1 bg-amber-500 text-white text-xs font-bold rounded">
                                                ראשית
                                            </div>
                                        )}
                                        <button
                                            onClick={() => removePhoto(index)}
                                            className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {photos.length === 0 && (
                            <div className="text-center py-8 text-slate-400 dark:text-slate-400">
                                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">לא נבחרו תמונות עדיין</p>
                                <p className="text-xs mt-1">ניתן להוסיף תמונות מאוחר יותר</p>
                            </div>
                        )}
                    </div>
                );

            case 'review':
                return (
                    <div className="space-y-6 animate-in slide-in-from-right">
                        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                            <h3 className="font-bold text-lg text-amber-800 dark:text-amber-200">{formData.title}</h3>
                            <p className="text-amber-700 dark:text-amber-300/80 text-sm mt-1">{formData.description}</p>

                            <div className="flex gap-4 mt-3 text-xs text-amber-600 dark:text-amber-400">
                                <span>⏱️ {(formData.prep_time || 0) + (formData.cook_time || 0)} דקות</span>
                                <span>🍽️ {formData.servings} מנות</span>
                                <span>📊 {formData.difficulty}</span>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-2">מרכיבים ({formData.ingredients.filter(i => i).length})</h4>
                            <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1">
                                {formData.ingredients.filter(i => i).map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-2">הוראות ({formData.instructions.filter(i => i).length})</h4>
                            <ol className="list-decimal list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1">
                                {formData.instructions.filter(i => i).map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ol>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#0d1424]/60 backdrop-blur-xl w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="bg-amber-100 dark:bg-amber-900/40 p-2 rounded-lg">
                            <ChefHat className="text-amber-600 dark:text-amber-400" size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-100">הוספת מתכון חדש</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={24} />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="px-6 pt-6 pb-2">
                    <div className="flex justify-between mb-2">
                        {['פרטים', 'מרכיבים', 'הוראות', 'תמונות', 'סיום'].map((stepName, i) => {
                            const stepIds: Step[] = ['basics', 'ingredients', 'instructions', 'photos', 'review'];
                            const isActive = stepIds.indexOf(currentStep) >= i;
                            return (
                                <span key={i} className={`text-xs font-medium ${isActive ? 'text-amber-600 dark:text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}>
                                    {stepName}
                                </span>
                            );
                        })}
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden flex">
                        {['basics', 'ingredients', 'instructions', 'photos', 'review'].map((step, i) => {
                            const stepIds: Step[] = ['basics', 'ingredients', 'instructions', 'photos', 'review'];
                            const currentIndex = stepIds.indexOf(currentStep);
                            const isCompleted = currentIndex > i;
                            const isCurrent = currentIndex === i;

                            return (
                                <div
                                    key={i}
                                    className={`flex-1 transition-all duration-300 ${isCompleted ? 'bg-amber-500' : isCurrent ? 'bg-amber-300' : 'bg-transparent'}`}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                    {renderStepContent()}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
                    <button
                        onClick={handleBack}
                        disabled={currentStep === 'basics' || loading}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium ${currentStep === 'basics'
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'
                            }`}
                    >
                        <ChevronRight size={18} /> חזור
                    </button>

                    {currentStep === 'review' ? (
                        <button
                            onClick={handleSubmit}
                            disabled={loading || uploadingPhotos}
                            className="bg-green-600 hover:bg-green-700 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-green-600/20 transition-all disabled:opacity-70"
                        >
                            {loading || uploadingPhotos ? <Check className="animate-spin" /> : <Check size={18} />}
                            {uploadingPhotos ? 'מעלה תמונות...' : loading ? 'שומר...' : 'פרסם מתכון'}
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            disabled={!formData.title && currentStep === 'basics'}
                            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all disabled:opacity-50 disabled:shadow-none"
                        >
                            המשך <ChevronLeft size={18} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper for Plus icon
const PlusIcon = ({ size = 16 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
);
