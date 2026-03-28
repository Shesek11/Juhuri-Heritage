// Feature Flags Service
// Provides centralized access to feature flag states

import apiService from './apiService';

export type FeatureFlagStatus = 'active' | 'admin_only' | 'coming_soon' | 'disabled';

export interface FeatureFlag {
    id: number;
    feature_key: string;
    name: string;
    name_en?: string | null;
    name_ru?: string | null;
    description: string;
    status: FeatureFlagStatus;
    sort_order: number;
    icon: string | null;
    link: string | null;
    show_in_nav: boolean;
    show_in_footer: boolean;
    created_at: string;
    updated_at: string;
}

export type FeatureFlagsMap = Record<string, FeatureFlagStatus>;

// Cache for public flags
let cachedFlags: FeatureFlagsMap | null = null;
let cachedFeatures: FeatureFlag[] | null = null;
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
    invalidateFlagsCache();
    return response;
};

/**
 * Reorder features (Admin only)
 */
export const reorderFeatures = async (order: { feature_key: string; sort_order: number }[]): Promise<void> => {
    await apiService.put('/admin/features', { order });
    invalidateFlagsCache();
};

/**
 * Get public feature flags (available features based on user role)
 * Returns both ordered list and legacy map
 */
export const getPublicFeatureFlags = async (): Promise<FeatureFlagsMap> => {
    if (cachedFlags && Date.now() - cacheTimestamp < CACHE_TTL) {
        return cachedFlags;
    }

    try {
        const response = await apiService.get<{ features: FeatureFlag[]; map: FeatureFlagsMap }>('/admin/features/public');
        cachedFlags = response.map;
        cachedFeatures = response.features;
        cacheTimestamp = Date.now();
        return response.map;
    } catch (error) {
        console.error('Error fetching feature flags:', error);
        return {};
    }
};

/**
 * Get ordered feature list (for nav, homepage, footer)
 */
export const getOrderedFeatures = async (): Promise<FeatureFlag[]> => {
    if (cachedFeatures && Date.now() - cacheTimestamp < CACHE_TTL) {
        return cachedFeatures;
    }
    await getPublicFeatureFlags(); // Populates cache
    return cachedFeatures || [];
};

/**
 * Check if a specific feature is enabled
 */
export const isFeatureEnabled = async (featureKey: string): Promise<boolean> => {
    const flags = await getPublicFeatureFlags();
    return featureKey in flags;
};

/**
 * Invalidate the feature flags cache
 */
export const invalidateFlagsCache = (): void => {
    cachedFlags = null;
    cachedFeatures = null;
    cacheTimestamp = 0;
};

export const featureFlagService = {
    getAllFeatureFlags,
    updateFeatureFlag,
    reorderFeatures,
    getPublicFeatureFlags,
    getOrderedFeatures,
    isFeatureEnabled,
    invalidateFlagsCache
};
