// RecipesRouter Component
// Handles routing between recipes list and recipe detail pages

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import RecipesPage from './RecipesPage';
import { RecipeDetailPage } from './recipes/RecipeDetailPage';

export const RecipesRouter: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<RecipesPage />} />
            <Route path="/:id" element={<RecipeDetailPage />} />
        </Routes>
    );
};

export default RecipesRouter;
