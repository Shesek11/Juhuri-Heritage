// CookingMode Component
// Fullscreen cooking mode with step-by-step navigation

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

    return createPortal(
        <div className="fixed top-0 left-0 right-0 bottom-0 z-[200] bg-slate-900 text-white flex flex-col">
            {/* Header */}
            <div className="bg-slate-800 border-b border-slate-700 p-3 md:p-4 flex-shrink-0">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                        <button
                            onClick={onClose}
                            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors flex-shrink-0"
                            title="חזור למתכון"
                        >
                            <X className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-base md:text-xl font-bold truncate">{recipe.title}</h1>
                            <p className="text-xs md:text-sm text-slate-400">
                                שלב {currentStep + 1} מתוך {totalSteps}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                        {/* Timer Display */}
                        {timerRunning && (
                            <div className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1 md:py-2 bg-amber-600 rounded-lg">
                                <Timer className="w-4 h-4 md:w-5 md:h-5" />
                                <span className="font-mono text-sm md:text-lg font-bold">
                                    {String(timerMinutes).padStart(2, '0')}:{String(timerSeconds).padStart(2, '0')}
                                </span>
                                <button
                                    onClick={stopTimer}
                                    className="text-xs underline hover:no-underline hidden md:inline"
                                >
                                    עצור
                                </button>
                            </div>
                        )}

                        <div className="hidden md:block text-start">
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <Users className="w-4 h-4" />
                                <span>{servings} מנות</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="max-w-7xl mx-auto mt-2 md:mt-3">
                    <div className="h-1.5 md:h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Main Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col lg:flex-row h-full">
                    {/* Left Sidebar - Ingredients (Hidden on mobile, collapsible) */}
                    <div className="hidden lg:block lg:w-80 bg-slate-800 border-s border-slate-700 p-6 overflow-y-auto">
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
                    <div className="flex-1 flex flex-col items-center justify-start p-4 md:p-8 lg:p-12 overflow-y-auto">
                        <div className="max-w-3xl w-full py-8">
                            {/* Step Number Badge */}
                            <div className="flex items-center justify-center mb-6 md:mb-8">
                                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-2xl md:text-3xl font-bold ${
                                    completedSteps.has(currentStep)
                                        ? 'bg-green-600'
                                        : 'bg-gradient-to-br from-amber-500 to-orange-500'
                                }`}>
                                    {completedSteps.has(currentStep) ? (
                                        <Check className="w-8 h-8 md:w-10 md:h-10" />
                                    ) : (
                                        currentStep + 1
                                    )}
                                </div>
                            </div>

                            {/* Step Text */}
                            <div className="text-center mb-8 md:mb-12">
                                <p className="text-2xl md:text-3xl lg:text-4xl leading-relaxed font-medium px-4">
                                    {recipe.instructions[currentStep]}
                                </p>
                            </div>

                            {/* Step Complete Button */}
                            <div className="flex justify-center mb-6 md:mb-8">
                                <button
                                    onClick={toggleStepComplete}
                                    className={`px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold text-base md:text-lg transition-all ${
                                        completedSteps.has(currentStep)
                                            ? 'bg-slate-700 text-slate-400'
                                            : 'bg-green-600 hover:bg-green-700'
                                    }`}
                                >
                                    {completedSteps.has(currentStep) ? 'סמן כלא הושלם' : 'סיימתי שלב זה'}
                                </button>
                            </div>

                            {/* Step Dots */}
                            <div className="flex justify-center gap-2 mb-6 md:mb-8 flex-wrap px-4">
                                {recipe.instructions.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentStep(index)}
                                        className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full transition-all ${
                                            index === currentStep
                                                ? 'w-6 md:w-8 bg-amber-500'
                                                : completedSteps.has(index)
                                                ? 'bg-green-600'
                                                : 'bg-slate-600 hover:bg-slate-500'
                                        }`}
                                    />
                                ))}
                            </div>

                            {/* Timer buttons on mobile */}
                            {!timerRunning && (
                                <div className="lg:hidden mt-8">
                                    <h3 className="text-sm font-medium mb-3 text-slate-400 text-center">טיימרים מהירים</h3>
                                    <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
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

                            {/* Keyboard Hints - Desktop only */}
                            <div className="hidden md:block text-center text-sm text-slate-400 mt-4">
                                <p>השתמש במקשי החצים לניווט • רווח לסימון • ESC ליציאה</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar - Step List (Hidden on mobile) */}
                    <div className="hidden lg:block lg:w-80 bg-slate-800 border-e border-slate-700 p-6 overflow-y-auto">
                        <h2 className="text-lg font-bold mb-4">כל השלבים</h2>
                        <div className="space-y-3">
                            {recipe.instructions.map((instruction, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentStep(index)}
                                    className={`w-full text-start p-3 rounded-lg transition-all ${
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
            </div>

            {/* Footer Navigation - Fixed */}
            <div className="bg-slate-800 border-t border-slate-700 p-3 md:p-4 flex-shrink-0">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
                    <button
                        onClick={handlePrevious}
                        disabled={currentStep === 0}
                        className="px-3 md:px-6 py-2 md:py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold flex items-center gap-1 md:gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm md:text-base"
                    >
                        <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                        <span className="hidden sm:inline">שלב קודם</span>
                        <span className="sm:hidden">קודם</span>
                    </button>

                    <div className="text-slate-400 text-xs md:text-sm text-center">
                        {completedSteps.size}/{totalSteps}
                    </div>

                    {currentStep < totalSteps - 1 ? (
                        <button
                            onClick={handleNext}
                            className="px-3 md:px-6 py-2 md:py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl font-bold flex items-center gap-1 md:gap-2 transition-all text-sm md:text-base"
                        >
                            <span className="hidden sm:inline">שלב הבא</span>
                            <span className="sm:hidden">הבא</span>
                            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className="px-3 md:px-6 py-2 md:py-3 bg-green-600 hover:bg-green-700 rounded-xl font-bold flex items-center gap-1 md:gap-2 transition-colors text-sm md:text-base"
                        >
                            <Check className="w-4 h-4 md:w-5 md:h-5" />
                            <span className="hidden sm:inline">סיום</span>
                            <span className="sm:hidden">סיום</span>
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CookingMode;
