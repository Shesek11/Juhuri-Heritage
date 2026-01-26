// Upload Service
// Handles file uploads to the server

import apiService from './apiService';

export interface UploadResponse {
    success: boolean;
    url: string;
    filename: string;
}

/**
 * Upload a file to the server
 * @param file - The file to upload
 * @returns Promise with upload response
 */
export const uploadFile = async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    return apiService.post<UploadResponse>('/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
};

/**
 * Add uploaded photo to recipe
 * @param recipeId - The recipe ID
 * @param photoUrl - The uploaded photo URL
 * @param isMain - Whether this is the main photo
 * @returns Promise with response
 */
export const addRecipePhoto = async (
    recipeId: number,
    photoUrl: string,
    isMain: boolean = false
): Promise<{ success: boolean; photo_id: number; message: string }> => {
    return apiService.post(`/recipes/${recipeId}/photos`, {
        url: photoUrl,
        is_main: isMain
    });
};

export const uploadService = {
    uploadFile,
    addRecipePhoto
};

export default uploadService;
