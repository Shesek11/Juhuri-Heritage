// Recipes Service
// API calls for recipes module

import apiService from './apiService';

export interface RecipeTag {
    id: number;
    name: string;
    name_hebrew: string;
    icon: string;
    color: string;
    category?: string;
}

export interface RecipePhoto {
    id: number;
    recipe_id: number;
    url: string;
    is_main: boolean;
    alt_text?: string;
}

export interface RecipeComment {
    id: number;
    recipe_id: number;
    user_id: number;
    author_name: string;
    author_avatar?: string;
    content: string;
    created_at: string;
}

export interface Recipe {
    id: number;
    title: string;
    title_juhuri?: string;
    description?: string;
    story?: string;
    ingredients: string[];
    instructions: string[];
    prep_time?: number;
    cook_time?: number;
    servings?: number;
    difficulty: 'easy' | 'medium' | 'hard';
    region_id?: number;
    region_name?: string;
    user_id: number;
    author_name: string;
    author_avatar?: string;
    is_approved: boolean;
    is_featured: boolean;
    view_count: number;
    main_photo?: string;
    like_count?: number;
    comment_count?: number;
    photos?: RecipePhoto[];
    tags?: RecipeTag[];
    likes?: { count: number; userLiked: boolean };
    comments?: RecipeComment[];
    created_at: string;
    updated_at: string;
}

export interface RecipesResponse {
    recipes: Recipe[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export interface RecipeInput {
    title: string;
    title_juhuri?: string;
    description?: string;
    story?: string;
    ingredients: string[];
    instructions: string[];
    prep_time?: number;
    cook_time?: number;
    servings?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    region_id?: number;
    tags?: number[];
}

// Get all recipes with optional filters
export const getRecipes = async (params?: {
    region?: number;
    tag?: number;
    tags?: number[]; // Multi-select tags support
    search?: string;
    sort?: 'newest' | 'popular' | 'likes' | 'oldest';
    page?: number;
    limit?: number;
}): Promise<RecipesResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.region) queryParams.set('region', params.region.toString());
    if (params?.tag) queryParams.set('tag', params.tag.toString());
    if (params?.tags && params.tags.length > 0) {
        queryParams.set('tags', params.tags.join(','));
    }
    if (params?.search) queryParams.set('search', params.search);
    if (params?.sort) queryParams.set('sort', params.sort);
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const query = queryParams.toString();
    return apiService.get<RecipesResponse>(`/recipes${query ? `?${query}` : ''}`);
};

// Get single recipe by ID
export const getRecipe = async (id: number): Promise<Recipe> => {
    return apiService.get<Recipe>(`/recipes/${id}`);
};

// Create new recipe
export const createRecipe = async (recipe: RecipeInput): Promise<{ success: boolean; recipe_id: number; message: string }> => {
    return apiService.post<{ success: boolean; recipe_id: number; message: string }>('/recipes', recipe);
};

// Update recipe
export const updateRecipe = async (id: number, recipe: RecipeInput): Promise<{ success: boolean; message: string }> => {
    return apiService.put<{ success: boolean; message: string }>(`/recipes/${id}`, recipe);
};

// Delete recipe
export const deleteRecipe = async (id: number): Promise<{ success: boolean; message: string }> => {
    return apiService.delete<{ success: boolean; message: string }>(`/recipes/${id}`);
};

// Like/unlike recipe
export const toggleRecipeLike = async (id: number): Promise<{ liked: boolean }> => {
    return apiService.post<{ liked: boolean }>(`/recipes/${id}/like`, {});
};

// Add comment
export const addRecipeComment = async (id: number, content: string): Promise<RecipeComment> => {
    return apiService.post<RecipeComment>(`/recipes/${id}/comments`, { content });
};

// Get all tags
export const getRecipeTags = async (): Promise<RecipeTag[]> => {
    return apiService.get<RecipeTag[]>('/recipes/meta/tags');
};

// Admin: Get pending recipes
export const getPendingRecipes = async (): Promise<Recipe[]> => {
    return apiService.get<Recipe[]>('/recipes/admin/pending');
};

// Admin: Approve recipe
export const approveRecipe = async (id: number): Promise<{ success: boolean; message: string }> => {
    return apiService.post<{ success: boolean; message: string }>(`/recipes/admin/${id}/approve`, {});
};

export const recipesService = {
    getRecipes,
    getRecipe,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    toggleRecipeLike,
    addRecipeComment,
    getRecipeTags,
    getPendingRecipes,
    approveRecipe
};

export default recipesService;
