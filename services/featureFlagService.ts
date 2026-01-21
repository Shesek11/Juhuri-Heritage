// Feature Flags Service
// Provides centralized access to feature flag states

import apiService from './apiService';

export type FeatureFlagStatus = 'active' | 'admin_only' | 'coming_soon' | 'disabled';

export interface FeatureFlag {
    id: number;
    feature_key: string;
    name: string;
    description: string;
    status: FeatureFlagStatus;
    created_at: string;
    updated_at: string;
}

export type FeatureFlagsMap = Record<string, FeatureFlagStatus>;

// Cache for public flags
let cachedFlags: FeatureFlagsMap | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Get all feature flags (Admin only)
 */
export const getAllFeatureFlags = async (): Promise<FeatureFlag[]> => {
    const response = await apiService.get<FeatureFlag[]>('/admin/features');
    return response;
};

/**
 * Update a feature flag status (Admin only)
 */
export const updateFeatureFlag = async (
    featureKey: string,
    status: FeatureFlagStatus
): Promise<{ success: boolean; feature_key: string; status: FeatureFlagStatus }> => {
    const response = await apiService.put<{ success: boolean; feature_key: string; status: FeatureFlagStatus }>(
        `/admin/features/${featureKey}`,
        { status }
    );
    // Invalidate cache
    cachedFlags = null;
    return response;
};

/**
 * Get public feature flags (available features based on user role)
 */
export const getPublicFeatureFlags = async (): Promise<FeatureFlagsMap> => {
    // Check cache
    if (cachedFlags && Date.now() - cacheTimestamp < CACHE_TTL) {
        return cachedFlags;
    }

    try {
        const response = await apiService.get<FeatureFlagsMap>('/admin/features/public');
        cachedFlags = response;
        cacheTimestamp = Date.now();
        return response;
    } catch (error) {
        console.error('Error fetching feature flags:', error);
        return {};
    }
};

/**
 * Check if a specific feature is enabled
 */
export const isFeatureEnabled = async (featureKey: string): Promise<boolean> => {
    const flags = await getPublicFeatureFlags();
    return featureKey in flags;
};

/**
 * Invalidate the feature flags cache (call after admin toggles)
 */
export const invalidateFlagsCache = (): void => {
    cachedFlags = null;
    cacheTimestamp = 0;
};

export const featureFlagService = {
    getAllFeatureFlags,
    updateFeatureFlag,
    getPublicFeatureFlags,
    isFeatureEnabled,
    invalidateFlagsCache
};
