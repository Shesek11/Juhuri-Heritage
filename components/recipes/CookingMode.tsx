// CookingMode Component
// Fullscreen cooking mode with step-by-step navigation

import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Clock, Users, ChefHat, Timer } from 'lucide-react';
import { Recipe } from '../../services/recipesService';

interface CookingModeProps {
    recipe: Recipe;
    servings: number;
    onClose: () => void;
}

export const CookingMode: React.FC<CookingModeProps> = ({ recipe, servings, onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
    const [timerMinutes, setTimerMinutes] = useState(0);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [timerRunning, setTimerRunning] = useState(false);

    const totalSteps = recipe.instructions.length;
    const servingScale = servings / (recipe.servings || 4);

    // Simple ingredient scaling
    const scaleIngredient = (ingredient: string): string => {
        if (servingScale === 1) return ingredient;
        return ingredient.replace(/(\d+\.?\d*)/g, (match) => {
            const num = parseFloat(match);
            const scaled = num * servingScale;
            return scaled % 1 === 0 ? scaled.toString() : scaled.toFixed(1);
        });
    };

    // Timer countdown
    useEffect(() => {
        if (!timerRunning) return;

        const interval = setInterval(() => {
            if (timerSeconds > 0) {
                setTimerSeconds(timerSeconds - 1);
            } else if (timerMinutes > 0) {
                setTimerMinutes(timerMinutes - 1);
                setTimerSeconds(59);
            } else {
                setTimerRunning(false);
                // Play alert sound or notification
                if ('vibrate' in navigator) {
                    navigator.vibrate([200, 100, 200]);
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [timerRunning, timerMinutes, timerSeconds]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' && currentStep < totalSteps - 1) {
                handleNext();
            } else if (e.key === 'ArrowLeft' && currentStep > 0) {
                handlePrevious();
            } else if (e.key === 'Escape') {
                onClose();
            } else if (e.key === ' ') {
                e.preventDefault();
                toggleStepComplete();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentStep, completedSteps]);

    const handleNext = () => {
        if (currentStep < totalSteps - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const toggleStepComplete = () => {
        const newCompleted = new Set(completedSteps);
        if (newCompleted.has(currentStep)) {
            newCompleted.delete(currentStep);
        } else {
            newCompleted.add(currentStep);
        }
        setCompletedSteps(newCompleted);
    };

    const startTimer = (minutes: number) => {
        setTimerMinutes(minutes);
        setTimerSeconds(0);
        setTimerRunning(true);
    };

    const stopTimer = () => {
        setTimerRunning(false);
        setTimerMinutes(0);
        setTimerSeconds(0);
    };

    const progress = ((currentStep + 1) / totalSteps) * 100;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900 text-white overflow-hidden">
            {/* Header */}
            <div className="bg-slate-800 border-b border-slate-700 p-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold">{recipe.title}</h1>
                            <p className="text-sm text-slate-400">
                                שלב {currentStep + 1} מתוך {totalSteps}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Timer Display */}
                        {timerRunning && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-amber-600 rounded-lg">
                                <Timer className="w-5 h-5" />
                                <span className="font-mono text-lg font-bold">
                                    {String(timerMinutes).padStart(2, '0')}:{String(timerSeconds).padStart(2, '0')}
                                </span>
                                <button
                                    onClick={stopTimer}
                                    className="text-xs underline hover:no-underline"
                                >
                                    עצור
                                </button>
                            </div>
                        )}

                        <div className="text-right">
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <Users className="w-4 h-4" />
                                <span>{servings} מנות</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="max-w-7xl mx-auto mt-3">
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex h-[calc(100vh-140px)]">
                {/* Left Sidebar - Ingredients */}
                <div className="w-80 bg-slate-800 border-r border-slate-700 p-6 overflow-y-auto">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <ChefHat className="w-5 h-5 text-amber-500" />
                        מרכיבים
                    </h2>
                    <div className="space-y-2">
                        {recipe.ingredients.map((ingredient, index) => (
                            <div
                                key={index}
                                className="text-sm text-slate-300 leading-relaxed"
                            >
                                • {scaleIngredient(ingredient)}
                            </div>
                        ))}
                    </div>

                    {/* Quick Timer Buttons */}
                    {!timerRunning && (
                        <div className="mt-8">
                            <h3 className="text-sm font-medium mb-3 text-slate-400">טיימרים מהירים</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {[5, 10, 15, 20, 30, 45].map((mins) => (
                                    <button
                                        key={mins}
                                        onClick={() => startTimer(mins)}
                                        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        {mins}׳
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Center - Current Step */}
                <div className="flex-1 flex flex-col items-center justify-center p-12 overflow-y-auto">
                    <div className="max-w-3xl w-full">
                        {/* Step Number Badge */}
                        <div className="flex items-center justify-center mb-8">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold ${
                                completedSteps.has(currentStep)
                                    ? 'bg-green-600'
                                    : 'bg-gradient-to-br from-amber-500 to-orange-500'
                            }`}>
                                {completedSteps.has(currentStep) ? (
                                    <Check className="w-10 h-10" />
                                ) : (
                                    currentStep + 1
                                )}
                            </div>
                        </div>

                        {/* Step Text */}
                        <div className="text-center mb-12">
                            <p className="text-3xl md:text-4xl leading-relaxed font-medium">
                                {recipe.instructions[currentStep]}
                            </p>
                        </div>

                        {/* Step Complete Button */}
                        <div className="flex justify-center mb-8">
                            <button
                                onClick={toggleStepComplete}
                                className={`px-8 py-4 rounded-xl font-bold text-lg transition-all ${
                                    completedSteps.has(currentStep)
                                        ? 'bg-slate-700 text-slate-400'
                                        : 'bg-green-600 hover:bg-green-700'
                                }`}
                            >
                                {completedSteps.has(currentStep) ? 'סמן כלא הושלם' : 'סיימתי שלב זה'}
                            </button>
                        </div>

                        {/* Step Dots */}
                        <div className="flex justify-center gap-2 mb-8">
                            {recipe.instructions.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentStep(index)}
                                    className={`w-3 h-3 rounded-full transition-all ${
                                        index === currentStep
                                            ? 'w-8 bg-amber-500'
                                            : completedSteps.has(index)
                                            ? 'bg-green-600'
                                            : 'bg-slate-600 hover:bg-slate-500'
                                    }`}
                                />
                            ))}
                        </div>

                        {/* Keyboard Hints */}
                        <div className="text-center text-sm text-slate-500">
                            <p>השתמש במקשי החצים לניווט • רווח לסימון • ESC ליציאה</p>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar - Step List */}
                <div className="w-80 bg-slate-800 border-l border-slate-700 p-6 overflow-y-auto">
                    <h2 className="text-lg font-bold mb-4">כל השלבים</h2>
                    <div className="space-y-3">
                        {recipe.instructions.map((instruction, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentStep(index)}
                                className={`w-full text-right p-3 rounded-lg transition-all ${
                                    index === currentStep
                                        ? 'bg-amber-600'
                                        : completedSteps.has(index)
                                        ? 'bg-green-900/30 border border-green-700'
                                        : 'bg-slate-700 hover:bg-slate-600'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                        completedSteps.has(index) ? 'bg-green-600' : 'bg-slate-600'
                                    }`}>
                                        {completedSteps.has(index) ? <Check className="w-4 h-4" /> : index + 1}
                                    </div>
                                    <p className="flex-1 text-sm leading-relaxed line-clamp-2">
                                        {instruction}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer Navigation */}
            <div className="bg-slate-800 border-t border-slate-700 p-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <button
                        onClick={handlePrevious}
                        disabled={currentStep === 0}
                        className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                        שלב קודם
                    </button>

                    <div className="text-slate-400 text-sm">
                        {completedSteps.size} מתוך {totalSteps} שלבים הושלמו
                    </div>

                    {currentStep < totalSteps - 1 ? (
                        <button
                            onClick={handleNext}
                            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl font-bold flex items-center gap-2 transition-all"
                        >
                            שלב הבא
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-xl font-bold flex items-center gap-2 transition-colors"
                        >
                            <Check className="w-5 h-5" />
                            סיום בישול
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CookingMode;
