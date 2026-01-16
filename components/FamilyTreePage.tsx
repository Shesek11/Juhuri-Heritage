import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FamDiagram } from 'basicprimitives/react';
import { FamConfig, FamItemConfig, Enabled, PageFitMode, GroupByType, ConnectorType, ElbowType, LineType, Colors, AnnotationType } from 'basicprimitives';
import { familyService, FamilyMember } from '../services/familyService';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Loader2 } from 'lucide-react';
import { AddMemberModal } from './family/AddMemberModal';
import { EditMemberModal } from './family/EditMemberModal';
import { AddRelativeModal } from './family/AddRelativeModal';

// Convert our data to BasicPrimitives format
interface BPItem extends FamItemConfig {
    id: number;
    parents: number[];
    title: string;
    description: string;
    image: string;
    itemTitleColor: string;
    member?: FamilyMember;
}

export function FamilyTreePage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<BPItem[]>([]);
    const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddRelativeModalOpen, setIsAddRelativeModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
    const [addRelativeType, setAddRelativeType] = useState<'parent' | 'child' | 'spouse'>('child');

    // Search
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedItem, setHighlightedItem] = useState<number | null>(null);

    const loadTree = useCallback(async () => {
        try {
            setLoading(true);
            const data = await familyService.getTreeData();
            setAllMembers(data.members || []);

            // Build parent map from relationships
            const parentMap = new Map<number, number[]>();
            (data.parentChild || []).forEach(pc => {
                const existing = parentMap.get(pc.child_id) || [];
                existing.push(pc.parent_id);
                parentMap.set(pc.child_id, existing);
            });

            // Build partner map (for visual grouping, not hierarchy)
            const partnerMap = new Map<number, number[]>();
            (data.partnerships || []).forEach(p => {
                const p1Partners = partnerMap.get(p.person1_id) || [];
                p1Partners.push(p.person2_id);
                partnerMap.set(p.person1_id, p1Partners);

                const p2Partners = partnerMap.get(p.person2_id) || [];
                p2Partners.push(p.person1_id);
                partnerMap.set(p.person2_id, p2Partners);
            });

            // Convert to BasicPrimitives items
            const bpItems: BPItem[] = (data.members || []).map(member => ({
                id: member.id,
                parents: parentMap.get(member.id) || [],
                title: `${member.first_name} ${member.last_name || ''}`.trim(),
                description: member.birth_date ? `${member.birth_date.split('-')[0]}` : '',
                image: member.photo_url || '/api/placeholder/80/80',
                itemTitleColor: member.gender === 'male' ? '#4A90D9' : member.gender === 'female' ? '#D94A8C' : '#888888',
                // Store original data for click handling
                templateName: 'defaultTemplate',
                member: member
            }));

            setItems(bpItems);
        } catch (error) {
            console.error('Failed to load tree:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTree();
    }, [loadTree]);

    const handleItemClick = useCallback((item: BPItem) => {
        const member = allMembers.find(m => m.id === item.id);
        if (member) {
            setSelectedMember(member);
            setIsEditModalOpen(true);
        }
    }, [allMembers]);

    const handleSearch = useCallback(() => {
        if (!searchQuery.trim()) {
            setHighlightedItem(null);
            return;
        }
        const found = items.find(item =>
            item.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (found) {
            setHighlightedItem(found.id);
        }
    }, [searchQuery, items]);

    // BasicPrimitives config
    const config: FamConfig = {
        items: items,
        cursorItem: highlightedItem,
        hasSelectorCheckbox: Enabled.False,
        pageFitMode: PageFitMode.None,
        groupByType: GroupByType.Parents,
        connectorType: ConnectorType.Squared,
        elbowType: ElbowType.Round,
        linesPalette: [
            { lineColor: '#94a3b8', lineWidth: 2, lineType: LineType.Solid }
        ],
        normalLevelShift: 40,
        normalItemsInterval: 20,
        cousinsIntervalMultiplier: 1,
        templates: [{
            name: 'defaultTemplate',
            itemSize: { width: 160, height: 100 },
            minimizedItemSize: { width: 4, height: 4 },
            highlightPadding: { left: 4, top: 4, right: 4, bottom: 4 },
            onItemRender: ({ context: itemConfig }: { context: BPItem }) => {
                const member = itemConfig.member;
                return (
                    <div
                        className="bg-white rounded-xl shadow-lg border-2 p-3 cursor-pointer hover:shadow-xl transition-all h-full flex flex-col items-center justify-center"
                        style={{ borderColor: itemConfig.itemTitleColor }}
                        onClick={() => handleItemClick(itemConfig)}
                    >
                        <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold mb-2"
                            style={{ backgroundColor: itemConfig.itemTitleColor }}
                        >
                            {itemConfig.title.charAt(0)}
                        </div>
                        <div className="text-center">
                            <div className="font-semibold text-gray-800 text-sm">{itemConfig.title}</div>
                            {itemConfig.description && (
                                <div className="text-xs text-gray-500">{itemConfig.description}</div>
                            )}
                        </div>
                    </div>
                );
            }
        }],
        defaultTemplateName: 'defaultTemplate',
        onCursorChanged: (event, data) => {
            if (data.context) {
                handleItemClick(data.context as BPItem);
            }
        }
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
            <div className="bg-slate-800/50 backdrop-blur border-b border-slate-700 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-white">🌳 אילן יוחסין</h1>
                    <span className="text-slate-400 text-sm">{items.length} בני משפחה</span>
                </div>

                <div className="flex items-center gap-4">
                    {/* Search */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="חיפוש..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="bg-slate-700 text-white px-4 py-2 pl-10 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none w-64"
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
            <div className="flex-1 overflow-hidden">
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
