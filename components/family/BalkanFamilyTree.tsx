/**
 * Balkan FamilyTree React Wrapper Component
 * Wraps the FamilyTree.js library for use in React
 */

import React, { useEffect, useRef, useState } from 'react';
import { fetchBalkanTreeData, BalkanNode } from '../../services/balkanService';

// Declare global FamilyTree from CDN
declare global {
    interface Window {
        FamilyTree: any;
    }
}

interface BalkanFamilyTreeProps {
    onNodeClick?: (node: BalkanNode) => void;
    onAddMember?: () => void;
}

const BalkanFamilyTree: React.FC<BalkanFamilyTreeProps> = ({ onNodeClick, onAddMember }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const familyTreeRef = useRef<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [nodes, setNodes] = useState<BalkanNode[]>([]);

    useEffect(() => {
        loadTreeData();
    }, []);

    const loadTreeData = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchBalkanTreeData();
            setNodes(data);
        } catch (err) {
            setError('שגיאה בטעינת נתוני העץ');
            console.error('Failed to load tree:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!containerRef.current || loading || nodes.length === 0) return;
        if (!window.FamilyTree) {
            setError('ספריית FamilyTree לא נטענה');
            return;
        }

        // Clear previous instance
        if (familyTreeRef.current) {
            familyTreeRef.current.destroy?.();
        }

        // Initialize FamilyTree
        familyTreeRef.current = new window.FamilyTree(containerRef.current, {
            nodes: nodes,
            nodeBinding: {
                field_0: 'name',
                field_1: 'title',
                img_0: 'img',
            },
            template: 'hugo',
            roots: findRoots(nodes),
            nodeMenu: {
                edit: { text: 'עריכה' },
                details: { text: 'פרטים' },
            },
            toolbar: {
                zoom: true,
                fit: true,
                expandAll: true,
            },
            enableDragDrop: false,
            scaleInitial: window.FamilyTree.match.boundary,
            orientation: window.FamilyTree.orientation.top,
            mode: 'dark',
            anim: {
                func: window.FamilyTree.anim.outPow,
                duration: 300
            },
            // RTL support
            layout: window.FamilyTree.layout.normal,
            // Node click handler
            nodeMouseClick: window.FamilyTree.action.none,
        });

        // Add click event
        familyTreeRef.current.on('click', (args: any) => {
            const node = nodes.find(n => n.id === args.node.id);
            if (node && onNodeClick) {
                onNodeClick(node);
            }
            return false; // Prevent default edit
        });

        return () => {
            if (familyTreeRef.current?.destroy) {
                familyTreeRef.current.destroy();
            }
        };
    }, [nodes, loading, onNodeClick]);

    // Find root nodes (members without parents)
    const findRoots = (nodes: BalkanNode[]): number[] => {
        return nodes
            .filter(n => !n.fid && !n.mid)
            .map(n => n.id);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[600px] bg-slate-800/50 rounded-xl">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-300">טוען את עץ המשפחה...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-[600px] bg-slate-800/50 rounded-xl">
                <div className="text-center">
                    <p className="text-red-400 text-xl mb-4">❌ {error}</p>
                    <button
                        onClick={loadTreeData}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition"
                    >
                        נסה שוב
                    </button>
                </div>
            </div>
        );
    }

    if (nodes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[600px] bg-slate-800/50 rounded-xl">
                <p className="text-slate-300 text-xl mb-4">🌱 העץ ריק</p>
                <p className="text-slate-400 mb-6">התחל לבנות את עץ המשפחה שלך</p>
                {onAddMember && (
                    <button
                        onClick={onAddMember}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition flex items-center gap-2"
                    >
                        <span>+</span>
                        הוסף בן משפחה ראשון
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Tree Stats */}
            <div className="absolute top-4 left-4 z-10 bg-slate-800/80 backdrop-blur rounded-lg px-4 py-2 text-sm">
                <span className="text-slate-400">בני משפחה: </span>
                <span className="text-emerald-400 font-bold">{nodes.length}</span>
            </div>

            {/* Tree Container */}
            <div
                ref={containerRef}
                className="w-full h-[600px] bg-slate-900 rounded-xl overflow-hidden"
                style={{ direction: 'ltr' }} // FamilyTree needs LTR container
            />
        </div>
    );
};

export default BalkanFamilyTree;
