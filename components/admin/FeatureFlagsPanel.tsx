// FeatureFlagsPanel.tsx
// Admin UI for managing feature flags (switchboard)

import React, { useState, useEffect } from 'react';
import { ToggleLeft, ToggleRight, Shield, Users, Ban, RefreshCw, Loader2 } from 'lucide-react';
import { featureFlagService, FeatureFlag, FeatureFlagStatus } from '../../services/featureFlagService';

interface StatusConfig {
    label: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
}

const STATUS_CONFIG: Record<FeatureFlagStatus, StatusConfig> = {
    active: {
        label: 'פעיל לכולם',
        icon: <Users className="w-4 h-4" />,
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30'
    },
    admin_only: {
        label: 'מנהלים בלבד',
        icon: <Shield className="w-4 h-4" />,
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-100 dark:bg-amber-900/30'
    },
    disabled: {
        label: 'כבוי',
        icon: <Ban className="w-4 h-4" />,
        color: 'text-slate-500 dark:text-slate-400',
        bgColor: 'bg-slate-100 dark:bg-slate-800'
    }
};

const STATUSES: FeatureFlagStatus[] = ['active', 'admin_only', 'disabled'];

export const FeatureFlagsPanel: React.FC = () => {
    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadFlags = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await featureFlagService.getAllFeatureFlags();
            setFlags(data);
        } catch (err) {
            setError('שגיאה בטעינת הפיצ\'רים');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFlags();
    }, []);

    const handleStatusChange = async (flag: FeatureFlag, newStatus: FeatureFlagStatus) => {
        if (newStatus === flag.status) return;

        setUpdating(flag.feature_key);
        try {
            await featureFlagService.updateFeatureFlag(flag.feature_key, newStatus);
            // Update local state
            setFlags(prev => prev.map(f =>
                f.feature_key === flag.feature_key
                    ? { ...f, status: newStatus }
                    : f
            ));
        } catch (err) {
            console.error('Error updating flag:', err);
            setError('שגיאה בעדכון הפיצ\'ר');
        } finally {
            setUpdating(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                <span className="mr-2 text-slate-600 dark:text-slate-400">טוען פיצ\'רים...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">
                        ניהול פיצ'רים
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        הפעל וכבה פיצ'רים בזמן אמת
                    </p>
                </div>
                <button
                    onClick={loadFlags}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="רענן"
                >
                    <RefreshCw className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
            </div>

            {error && (
                <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* Flags List */}
            <div className="space-y-3">
                {flags.map(flag => {
                    const currentConfig = STATUS_CONFIG[flag.status];
                    const isUpdating = updating === flag.feature_key;

                    return (
                        <div
                            key={flag.feature_key}
                            className={`p-4 rounded-xl border transition-all ${isUpdating
                                    ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                                }`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-medium text-slate-800 dark:text-slate-200">
                                            {flag.name}
                                        </h4>
                                        <span className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${currentConfig.bgColor} ${currentConfig.color}`}>
                                            {currentConfig.icon}
                                            {currentConfig.label}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                        {flag.description}
                                    </p>
                                    <code className="text-xs text-slate-400 dark:text-slate-500 mt-1 block">
                                        {flag.feature_key}
                                    </code>
                                </div>

                                {/* Toggle Buttons */}
                                <div className="flex gap-1 flex-shrink-0">
                                    {STATUSES.map(status => {
                                        const config = STATUS_CONFIG[status];
                                        const isActive = flag.status === status;

                                        return (
                                            <button
                                                key={status}
                                                onClick={() => handleStatusChange(flag, status)}
                                                disabled={isUpdating}
                                                className={`p-2 rounded-lg transition-all text-sm ${isActive
                                                        ? `${config.bgColor} ${config.color} ring-2 ring-offset-1 ring-current`
                                                        : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400'
                                                    } ${isUpdating ? 'opacity-50 cursor-wait' : ''}`}
                                                title={config.label}
                                            >
                                                {isUpdating && isActive ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    config.icon
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {flags.length === 0 && !error && (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    לא נמצאו פיצ'רים להגדרה
                </div>
            )}
        </div>
    );
};

export default FeatureFlagsPanel;
