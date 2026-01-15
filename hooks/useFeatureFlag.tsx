// useFeatureFlag Hook
// React hook for checking feature availability

import { useState, useEffect, useCallback } from 'react';
import { featureFlagService, FeatureFlagsMap } from '../services/featureFlagService';

/**
 * Hook to access all feature flags
 */
export const useFeatureFlags = () => {
    const [flags, setFlags] = useState<FeatureFlagsMap>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            featureFlagService.invalidateFlagsCache();
            const data = await featureFlagService.getPublicFeatureFlags();
            setFlags(data);
            setError(null);
        } catch (err) {
            setError('Failed to load feature flags');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { flags, loading, error, refresh };
};

/**
 * Hook to check if a specific feature is enabled
 */
export const useFeatureFlag = (featureKey: string): {
    isEnabled: boolean;
    loading: boolean;
    status: string | null;
} => {
    const [isEnabled, setIsEnabled] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkFlag = async () => {
            try {
                const flags = await featureFlagService.getPublicFeatureFlags();
                const enabled = featureKey in flags;
                setIsEnabled(enabled);
                setStatus(flags[featureKey] || 'disabled');
            } catch (error) {
                console.error('Error checking feature flag:', error);
                setIsEnabled(false);
                setStatus('disabled');
            } finally {
                setLoading(false);
            }
        };
        checkFlag();
    }, [featureKey]);

    return { isEnabled, loading, status };
};

/**
 * Simple component wrapper that only renders children if feature is enabled
 */
export const FeatureGate: React.FC<{
    feature: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}> = ({ feature, children, fallback = null }) => {
    const { isEnabled, loading } = useFeatureFlag(feature);

    if (loading) return null;
    if (!isEnabled) return <>{fallback}</>;
    return <>{children}</>;
};
