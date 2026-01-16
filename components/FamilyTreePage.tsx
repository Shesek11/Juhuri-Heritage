import React, { useState, useCallback, useEffect } from 'react';
import { FamDiagram } from 'basicprimitivesreact';
import {
    FamConfig,
    Enabled,
    PageFitMode,
    GroupByType,
    ConnectorType,
    ElbowType,
    LineType,
    NavigationMode,
    OrientationType
} from 'basicprimitives';
import { familyService, FamilyMember } from '../services/familyService';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Loader2, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { AddMemberModal } from './family/AddMemberModal';
import { EditMemberModal } from './family/EditMemberModal';
import { AddRelativeModal } from './family/AddRelativeModal';

// BasicPrimitives item interface
interface FamilyItem {
    id: number;
    parents: number[];
    spouses: number[];
    title: string;
    description: string;
    image: string | null;
    itemTitleColor: string;
    groupTitle?: string;
}

export function FamilyTreePage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<FamilyItem[]>([]);
    const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);
    const [cursorItem, setCursorItem] = useState<number | null>(null);

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddRelativeModalOpen, setIsAddRelativeModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
    const [addRelativeType, setAddRelativeType] = useState<'parent' | 'child' | 'spouse'>('child');

    // Search
    const [searchQuery, setSearchQuery] = useState('');

    const loadTree = useCallback(async () => {
        try {
            setLoading(true);
            const data = await familyService.getTreeData();
            setAllMembers(data.members || []);

            // Build parent map: child_id -> [parent_ids]
            const parentMap = new Map<number, number[]>();
            (data.parentChild || []).forEach((pc: { parent_id: number; child_id: number }) => {
                const existing = parentMap.get(pc.child_id) || [];
                existing.push(pc.parent_id);
                parentMap.set(pc.child_id, existing);
            });

            // Build spouse map: person_id -> [spouse_ids]
            const spouseMap = new Map<number, number[]>();
            (data.partnerships || []).forEach((p: { person1_id: number; person2_id: number }) => {
                // Add both directions
                const s1 = spouseMap.get(p.person1_id) || [];
                if (!s1.includes(p.person2_id)) s1.push(p.person2_id);
                spouseMap.set(p.person1_id, s1);

                const s2 = spouseMap.get(p.person2_id) || [];
                if (!s2.includes(p.person1_id)) s2.push(p.person1_id);
                spouseMap.set(p.person2_id, s2);
            });

            // Convert to BasicPrimitives items
            const familyItems: FamilyItem[] = (data.members || []).map((member: FamilyMember) => ({
                id: member.id,
                parents: parentMap.get(member.id) || [],
                spouses: spouseMap.get(member.id) || [],
                title: `${member.first_name} ${member.last_name || ''}`.trim(),
                description: member.birth_date ? member.birth_date.split('-')[0] : '',
                image: member.photo_url || null,
                itemTitleColor: member.gender === 'male' ? '#3B82F6' :
                    member.gender === 'female' ? '#EC4899' : '#6B7280',
                groupTitle: member.last_name || undefined
            }));

            setItems(familyItems);

            // Set cursor to first root item (person without parents)
            const rootItem = familyItems.find(item => item.parents.length === 0);
            if (rootItem) {
                setCursorItem(rootItem.id);
            }
        } catch (error) {
            console.error('Failed to load tree:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTree();
    }, [loadTree]);

    const handleSearch = useCallback(() => {
        if (!searchQuery.trim()) {
            return;
        }
        const found = items.find(item =>
            item.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (found) {
            setCursorItem(found.id);
        }
    }, [searchQuery, items]);

    const openMemberDetails = (memberId: number) => {
        const member = allMembers.find(m => m.id === memberId);
        if (member) {
            setSelectedMember(member);
            setIsEditModalOpen(true);
        }
    };

    // BasicPrimitives configuration
    const config: FamConfig = {
        navigationMode: NavigationMode.Default,
        pageFitMode: PageFitMode.None,
        orientationType: OrientationType.Top,
        hasSelectorCheckbox: Enabled.False,
        groupByType: GroupByType.Children,

        // Items
        items: items,
        cursorItem: cursorItem,

        // Connectors
        arrowsDirection: GroupByType.Parents,
        connectorType: ConnectorType.Squared,
        elbowType: ElbowType.Round,
        linesColor: '#64748B',
        linesWidth: 2,
        linesType: LineType.Solid,

        // Layout
        normalLevelShift: 60,
        dotLevelShift: 30,
        lineLevelShift: 20,
        normalItemsInterval: 30,
        dotItemsInterval: 10,
        lineItemsInterval: 10,

        // Callbacks
        onCursorChanged: (event: any, data: any) => {
            if (data.context) {
                setCursorItem(data.context.id);
            }
        },
        onCursorChanging: (event: any, data: any) => {
            // Allow cursor change
            return true;
        },

        // Templates - using default built-in template
        templates: [{
            name: 'defaultTemplate',
            itemSize: { width: 140, height: 80 },
            minimizedItemSize: { width: 4, height: 4 },
            onItemRender: ({ context }: { context: FamilyItem }) => {
                return (
                    <div
                        className="w-full h-full bg-white rounded-lg shadow-md border-2 flex flex-col items-center justify-center p-2 cursor-pointer hover:shadow-lg transition-shadow"
                        style={{ borderColor: context.itemTitleColor }}
                        onClick={() => openMemberDetails(context.id)}
                    >
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm mb-1"
                            style={{ backgroundColor: context.itemTitleColor }}
                        >
                            {context.title.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-center">
                            <div className="font-medium text-gray-800 text-xs leading-tight">{context.title}</div>
                            {context.description && (
                                <div className="text-gray-500 text-xs">{context.description}</div>
                            )}
                        </div>
                    </div>
                );
            }
        }],
        defaultTemplateName: 'defaultTemplate'
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col" dir="rtl">
            {/* Header */}
            <div className="bg-slate-800/80 backdrop-blur border-b border-slate-700 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-white">🌳 אילן יוחסין</h1>
                    <span className="text-slate-400 text-sm">{items.length} בני משפחה</span>
                </div>

                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="חיפוש..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="bg-slate-700 text-white px-4 py-2 pl-10 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none w-56"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>

                    {/* Add Member Button */}
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        הוסף בן משפחה
                    </button>
                </div>
            </div>

            {/* Tree Container */}
            <div className="flex-1 overflow-hidden relative">
                {items.length > 0 ? (
                    <FamDiagram centerOnCursor={true} config={config} />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <p className="text-lg mb-4">אין בני משפחה להצגה</p>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            הוסף את בן המשפחה הראשון
                        </button>
                    </div>
                )}
            </div>

            {/* Modals */}
            {isAddModalOpen && (
                <AddMemberModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={() => {
                        setIsAddModalOpen(false);
                        loadTree();
                    }}
                />
            )}

            {isEditModalOpen && selectedMember && (
                <EditMemberModal
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedMember(null);
                    }}
                    member={selectedMember}
                    onSuccess={() => {
                        setIsEditModalOpen(false);
                        setSelectedMember(null);
                        loadTree();
                    }}
                />
            )}

            {isAddRelativeModalOpen && selectedMember && (
                <AddRelativeModal
                    isOpen={isAddRelativeModalOpen}
                    onClose={() => {
                        setIsAddRelativeModalOpen(false);
                        setSelectedMember(null);
                    }}
                    relativeTo={selectedMember}
                    relationType={addRelativeType}
                    onSuccess={() => {
                        setIsAddRelativeModalOpen(false);
                        setSelectedMember(null);
                        loadTree();
                    }}
                />
            )}
        </div>
    );
}

export default FamilyTreePage;
