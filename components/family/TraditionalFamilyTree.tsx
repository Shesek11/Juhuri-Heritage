/**
 * TraditionalFamilyTree.tsx
 * Traditional hierarchical family tree using family-chart library
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import f3 from 'family-chart';
import { familyService, FamilyMember } from '../../services/familyService';
import { EditMemberModal } from './EditMemberModal';
import { Loader2, UserPlus, Search, X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface F3Node {
    id: string;
    data: {
        first_name: string;
        last_name: string;
        gender: 'M' | 'F';
        birthday?: string;
        avatar?: string;
        [key: string]: any;
    };
    rels: {
        spouses?: string[];
        father?: string;
        mother?: string;
        children?: string[];
    };
}

export const TraditionalFamilyTree: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<FamilyMember[]>([]);
    const viewRef = useRef<any>(null);

    // Load data from API
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await familyService.getTreeData();
            setMembers(data.members || []);
            console.log('[TraditionalFamilyTree] Loaded:', data.members?.length, 'members');
        } catch (error) {
            console.error('[TraditionalFamilyTree] Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Transform data to family-chart format
    const transformToTreeData = useCallback((): F3Node[] => {
        if (members.length === 0) return [];

        const memberMap = new Map(members.map(m => [m.id, m]));
        const nodes: F3Node[] = [];

        // Build nodes
        members.forEach(m => {
            nodes.push({
                id: String(m.id),
                data: {
                    first_name: m.first_name,
                    last_name: m.last_name || '',
                    gender: m.gender === 'female' ? 'F' : 'M',
                    birthday: m.birth_date,
                    avatar: m.photo_url,
                    'birth-place': m.birth_place,
                    'current-residence': m.current_residence,
                    alive: m.is_alive
                },
                rels: {
                    spouses: [],
                    children: []
                }
            });
        });

        // Build relationships from API data
        // Note: We'll use the legacy fields for now, but we should migrate to use
        // the parentChild and partnerships from the API

        members.forEach(m => {
            const node = nodes.find(n => n.id === String(m.id));
            if (!node) return;

            // Father relationship
            if (m.father_id) {
                node.rels.father = String(m.father_id);
            }

            // Mother relationship
            if (m.mother_id) {
                node.rels.mother = String(m.mother_id);
            }

            // Spouse relationship (simplified for now)
            if (m.spouse_id) {
                const spouseId = String(m.spouse_id);
                if (!node.rels.spouses?.includes(spouseId)) {
                    node.rels.spouses?.push(spouseId);
                }

                // Add reciprocal relationship
                const spouseNode = nodes.find(n => n.id === spouseId);
                if (spouseNode && !spouseNode.rels.spouses?.includes(String(m.id))) {
                    spouseNode.rels.spouses?.push(String(m.id));
                }
            }
        });

        // Build children relationships (reverse of parent)
        nodes.forEach(node => {
            if (node.rels.father) {
                const fatherNode = nodes.find(n => n.id === node.rels.father);
                if (fatherNode && !fatherNode.rels.children?.includes(node.id)) {
                    fatherNode.rels.children?.push(node.id);
                }
            }
            if (node.rels.mother) {
                const motherNode = nodes.find(n => n.id === node.rels.mother);
                if (motherNode && !motherNode.rels.children?.includes(node.id)) {
                    motherNode.rels.children?.push(node.id);
                }
            }
        });

        console.log('[TraditionalFamilyTree] Transformed nodes:', nodes.length);
        return nodes;
    }, [members]);

    // Initialize family-chart
    useEffect(() => {
        if (!containerRef.current || loading || members.length === 0) return;

        const treeData = transformToTreeData();
        if (treeData.length === 0) return;

        console.log('[TraditionalFamilyTree] Initializing tree with', treeData.length, 'nodes');

        try {
            // Clear container
            containerRef.current.innerHTML = '';

            const store = f3.createStore({
                data: treeData,
                node_separation: 250,
                level_separation: 150
            });

            const view = f3.d3AnimationView({
                store: store,
                cont: containerRef.current
            });

            viewRef.current = view;

            // Custom card template for RTL and Hebrew
            view.setCard((props: any) => {
                const d = props.data;
                return `
                    <div class="f3-card" dir="rtl" style="
                        background: ${d.gender === 'F' ? '#fce7f3' : '#dbeafe'};
                        border: 3px solid ${d.gender === 'F' ? '#ec4899' : '#3b82f6'};
                        border-radius: 12px;
                        padding: 12px;
                        min-width: 180px;
                        text-align: right;
                        font-family: 'Heebo', 'Rubik', sans-serif;
                        cursor: pointer;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    ">
                        ${d.avatar ? `<img src="${d.avatar}" style="width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 8px; display: block; object-fit: cover;" />` : ''}
                        <div style="font-weight: bold; font-size: 16px; color: #1e293b; margin-bottom: 4px;">
                            ${d.first_name} ${d.last_name}
                        </div>
                        ${d.birthday ? `<div style="font-size: 12px; color: #64748b;">📅 ${new Date(d.birthday).getFullYear()}</div>` : ''}
                        ${d['birth-place'] ? `<div style="font-size: 11px; color: #64748b;">🏙️ ${d['birth-place']}</div>` : ''}
                        ${d.alive && d['current-residence'] ? `<div style="font-size: 11px; color: #64748b;">📍 ${d['current-residence']}</div>` : ''}
                    </div>
                `;
            });

            // Handle card clicks
            view.setCardClickHandler((props: any) => {
                const memberId = parseInt(props.data.id);
                const member = members.find(m => m.id === memberId);
                if (member) {
                    setSelectedMember(member);
                    setIsEditModalOpen(true);
                }
            });

            view.update();

            console.log('[TraditionalFamilyTree] Tree initialized successfully');
        } catch (error) {
            console.error('[TraditionalFamilyTree] Error initializing tree:', error);
        }

        return () => {
            // Cleanup
            if (viewRef.current) {
                viewRef.current = null;
            }
        };
    }, [members, loading, transformToTreeData]);

    // Search functionality
    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query.length >= 2) {
            const results = members.filter(m =>
                `${m.first_name} ${m.last_name}`.toLowerCase().includes(query.toLowerCase())
            );
            setSearchResults(results);
        } else {
            setSearchResults([]);
        }
    };

    // Focus on person
    const focusOnPerson = (memberId: number) => {
        // TODO: Implement focus/zoom to specific person
        const member = members.find(m => m.id === memberId);
        if (member) {
            setSelectedMember(member);
            setIsEditModalOpen(true);
        }
        setSearchQuery('');
        setSearchResults([]);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="flex flex-col bg-slate-900" style={{ height: 'calc(100vh - 60px)', minHeight: '600px' }}>
            {/* Header */}
            <div className="bg-slate-800/80 backdrop-blur px-4 py-3 flex items-center justify-between border-b border-slate-700 relative z-[100]">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-white">🌳 אילן היוחסין</h1>
                    <span className="text-sm text-slate-400">
                        {members.length} בני משפחה
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    {/* Search Bar */}
                    <div className="relative z-[9999]">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        <input
                            type="text"
                            placeholder="חפש אדם..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="pr-9 pl-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:border-amber-500 w-48 relative z-10"
                        />
                        {searchResults.length > 0 && (
                            <div className="absolute top-full mt-1 right-0 w-80 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl max-h-80 overflow-y-auto">
                                {searchResults.map(result => (
                                    <button
                                        key={result.id}
                                        onClick={() => focusOnPerson(result.id)}
                                        className="w-full text-right px-4 py-2.5 hover:bg-slate-700 transition-colors text-sm border-b border-slate-700 last:border-b-0"
                                    >
                                        <div className="font-medium text-white mb-1">{result.first_name} {result.last_name}</div>
                                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400">
                                            {result.birth_date && (
                                                <span>📅 {new Date(result.birth_date).getFullYear()}</span>
                                            )}
                                            {result.birth_place && (
                                                <span>🏙️ {result.birth_place}</span>
                                            )}
                                            {result.is_alive && result.current_residence && (
                                                <span>📍 {result.current_residence}</span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="w-px h-6 bg-slate-600" />

                    {/* Add Person Button */}
                    <button
                        onClick={() => {
                            setSelectedMember(null);
                            setIsEditModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white text-sm font-medium transition-colors"
                    >
                        <UserPlus size={16} />
                        <span>הוסף אדם</span>
                    </button>
                </div>
            </div>

            {/* Tree Container */}
            <div
                ref={containerRef}
                className="flex-1 relative overflow-auto bg-slate-900"
                style={{ direction: 'ltr' }}
            />

            {/* Edit Modal */}
            <EditMemberModal
                isOpen={isEditModalOpen}
                member={selectedMember}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedMember(null);
                }}
                onSuccess={() => {
                    setIsEditModalOpen(false);
                    setSelectedMember(null);
                    loadData();
                }}
                potentialRelations={members}
            />
        </div>
    );
};

export default TraditionalFamilyTree;
