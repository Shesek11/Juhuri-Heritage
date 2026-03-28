// FeatureFlagsPanel.tsx
// Admin UI for managing feature flags with drag-to-reorder and inline editing

import React, { useState, useEffect, useRef } from 'react';
import { Shield, Users, Ban, RefreshCw, Loader2, Clock, GripVertical, Pencil, Check, X } from 'lucide-react';
import { featureFlagService, FeatureFlag, FeatureFlagStatus } from '../../services/featureFlagService';
import apiService from '../../services/apiService';

interface StatusConfig {
    label: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
}

const STATUS_CONFIG: Record<FeatureFlagStatus, StatusConfig> = {
    active: { label: 'פעיל', icon: <Users className="w-3.5 h-3.5" />, color: 'text-green-400', bgColor: 'bg-green-900/40 border-green-500/30' },
    admin_only: { label: 'אדמין', icon: <Shield className="w-3.5 h-3.5" />, color: 'text-amber-400', bgColor: 'bg-amber-900/40 border-amber-500/30' },
    coming_soon: { label: 'בקרוב', icon: <Clock className="w-3.5 h-3.5" />, color: 'text-blue-400', bgColor: 'bg-blue-900/40 border-blue-500/30' },
    disabled: { label: 'כבוי', icon: <Ban className="w-3.5 h-3.5" />, color: 'text-slate-500', bgColor: 'bg-slate-800/40 border-slate-600/30' },
};

const STATUSES: FeatureFlagStatus[] = ['active', 'coming_soon', 'admin_only', 'disabled'];

export const FeatureFlagsPanel: React.FC = () => {
    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Inline editing
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const editInputRef = useRef<HTMLInputElement>(null);

    // Drag state
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

    useEffect(() => { loadFlags(); }, []);

    useEffect(() => {
        if (editingKey && editInputRef.current) editInputRef.current.focus();
    }, [editingKey]);

    const handleStatusChange = async (flag: FeatureFlag, newStatus: FeatureFlagStatus) => {
        if (newStatus === flag.status) return;
        setUpdating(flag.feature_key);
        try {
            await featureFlagService.updateFeatureFlag(flag.feature_key, newStatus);
            setFlags(prev => prev.map(f =>
                f.feature_key === flag.feature_key ? { ...f, status: newStatus } : f
            ));
        } catch (err) {
            console.error('Error updating flag:', err);
            setError('שגיאה בעדכון');
        } finally {
            setUpdating(null);
        }
    };

    const handleNameSave = async (flag: FeatureFlag) => {
        if (!editName.trim() || editName === flag.name) {
            setEditingKey(null);
            return;
        }
        try {
            await apiService.put(`/admin/features/${flag.feature_key}`, { name: editName.trim() });
            setFlags(prev => prev.map(f =>
                f.feature_key === flag.feature_key ? { ...f, name: editName.trim() } : f
            ));
            featureFlagService.invalidateFlagsCache();
        } catch (err) {
            console.error('Error updating name:', err);
        }
        setEditingKey(null);
    };

    // Drag handlers
    const handleDragStart = (index: number) => {
        setDragIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        setDragOverIndex(index);
    };

    const handleDrop = async (dropIndex: number) => {
        if (dragIndex === null || dragIndex === dropIndex) {
            setDragIndex(null);
            setDragOverIndex(null);
            return;
        }

        const newFlags = [...flags];
        const [moved] = newFlags.splice(dragIndex, 1);
        newFlags.splice(dropIndex, 0, moved);

        setFlags(newFlags);
        setDragIndex(null);
        setDragOverIndex(null);

        // Save new order
        const order = newFlags.map((f, i) => ({ feature_key: f.feature_key, sort_order: i + 1 }));
        try {
            await featureFlagService.reorderFeatures(order);
        } catch (err) {
            console.error('Error reordering:', err);
            loadFlags();
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                <span className="ms-2 text-slate-400">טוען...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-slate-200">ניהול פיצ'רים</h3>
                    <p className="text-sm text-slate-400">גרור לשינוי סדר. לחץ על השם לעריכה. הסדר משפיע על התפריט, עמוד הבית והפוטר.</p>
                </div>
                <button onClick={loadFlags} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="רענן">
                    <RefreshCw className="w-5 h-5 text-slate-400" />
                </button>
            </div>

            {error && (
                <div className="p-3 bg-red-900/30 text-red-300 rounded-lg text-sm">{error}</div>
            )}

            <div className="space-y-1">
                {flags.map((flag, index) => {
                    const config = STATUS_CONFIG[flag.status];
                    const isUpdating = updating === flag.feature_key;
                    const isEditing = editingKey === flag.feature_key;
                    const isDragOver = dragOverIndex === index;

                    return (
                        <div
                            key={flag.feature_key}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={() => handleDrop(index)}
                            onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing
                                ${isDragOver ? 'border-amber-500/50 bg-amber-900/20' : 'border-white/10 bg-[#0d1424]/60'}
                                ${dragIndex === index ? 'opacity-50' : ''}`}
                        >
                            {/* Drag handle */}
                            <GripVertical size={16} className="text-slate-600 flex-shrink-0" />

                            {/* Order number */}
                            <span className="text-xs text-slate-500 font-mono w-4">{index + 1}</span>

                            {/* Name (editable) */}
                            <div className="flex-1 min-w-0">
                                {isEditing ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            ref={editInputRef}
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleNameSave(flag);
                                                if (e.key === 'Escape') setEditingKey(null);
                                            }}
                                            className="bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white w-full"
                                        />
                                        <button onClick={() => handleNameSave(flag)} className="text-green-400 hover:text-green-300">
                                            <Check size={14} />
                                        </button>
                                        <button onClick={() => setEditingKey(null)} className="text-slate-400 hover:text-white">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-slate-200">{flag.name}</span>
                                        <button
                                            onClick={() => { setEditingKey(flag.feature_key); setEditName(flag.name); }}
                                            className="text-slate-600 hover:text-slate-300 transition-colors"
                                            title="ערוך שם"
                                        >
                                            <Pencil size={12} />
                                        </button>
                                        {flag.link && (
                                            <code className="text-[10px] text-slate-600">{flag.link}</code>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Status buttons */}
                            <div className="flex gap-1 flex-shrink-0">
                                {STATUSES.map(status => {
                                    const sc = STATUS_CONFIG[status];
                                    const isActive = flag.status === status;
                                    return (
                                        <button
                                            type="button"
                                            key={status}
                                            onClick={() => handleStatusChange(flag, status)}
                                            disabled={isUpdating}
                                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all border
                                                ${isActive ? `${sc.bgColor} ${sc.color}` : 'border-transparent hover:bg-white/5 text-slate-500'}
                                                ${isUpdating ? 'opacity-50' : ''}`}
                                            title={sc.label}
                                        >
                                            {isUpdating && isActive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : sc.icon}
                                            <span className="hidden sm:inline">{sc.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FeatureFlagsPanel;
