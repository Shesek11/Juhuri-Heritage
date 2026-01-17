import React, { useState, useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Controls,
    Background,
    MiniMap,
    useNodesState,
    useEdgesState,
    NodeProps,
    MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { familyService, FamilyMember } from '../services/familyService';
import { layoutFamilyTree } from '../services/layoutService';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Loader2, User } from 'lucide-react';
import { AddMemberModal } from './family/AddMemberModal';
import { EditMemberModal } from './family/EditMemberModal';
import { AddRelativeModal } from './family/AddRelativeModal';

// Custom node component for family members
function FamilyMemberNode({ data }: NodeProps) {
    const member = data.member;
    const color = data.color || '#6B7280';

    return (
        <div
            className="bg-white rounded-xl shadow-lg border-2 p-3 cursor-pointer hover:shadow-xl transition-all min-w-[140px]"
            style={{ borderColor: color }}
        >
            <div className="flex flex-col items-center">
                {member.photo_url ? (
                    <img
                        src={member.photo_url}
                        alt={member.first_name}
                        className="w-12 h-12 rounded-full object-cover mb-2 border-2"
                        style={{ borderColor: color }}
                    />
                ) : (
                    <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold mb-2"
                        style={{ backgroundColor: color }}
                    >
                        <User className="w-6 h-6" />
                    </div>
                )}
                <div className="text-center">
                    <div className="font-semibold text-gray-800 text-sm">
                        {member.first_name} {member.last_name || ''}
                    </div>
                    {member.birth_date && (
                        <div className="text-xs text-gray-500">
                            {member.birth_date.split('-')[0]}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Node types registration
const nodeTypes = {
    familyMember: FamilyMemberNode
};

export function FamilyTreePage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

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

            // Use our custom layout engine
            const { nodes: layoutedNodes, edges: layoutedEdges } = layoutFamilyTree(
                data.members || [],
                data.parentChild || [],
                data.partnerships || []
            );

            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
        } catch (error) {
            console.error('Failed to load tree:', error);
        } finally {
            setLoading(false);
        }
    }, [setNodes, setEdges]);

    useEffect(() => {
        loadTree();
    }, [loadTree]);

    const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        if (node.data?.member) {
            setSelectedMember(node.data.member);
            setIsEditModalOpen(true);
        }
    }, []);

    const handleSearch = useCallback(() => {
        if (!searchQuery.trim()) return;

        const found = nodes.find(node => {
            const member = node.data?.member;
            if (!member) return false;
            const fullName = `${member.first_name} ${member.last_name || ''}`.toLowerCase();
            return fullName.includes(searchQuery.toLowerCase());
        });

        if (found) {
            // You could implement fitView to the found node here
            const member = found.data?.member;
            if (member) {
                setSelectedMember(member);
                setIsEditModalOpen(true);
            }
        }
    }, [searchQuery, nodes]);

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
            <div className="bg-slate-800/80 backdrop-blur border-b border-slate-700 px-4 py-3 flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-white">🌳 אילן יוחסין</h1>
                    <span className="text-slate-400 text-sm">{allMembers.length} בני משפחה</span>
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
            <div className="flex-1">
                {nodes.length > 0 ? (
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onNodeClick={handleNodeClick}
                        nodeTypes={nodeTypes}
                        fitView
                        fitViewOptions={{ padding: 0.2 }}
                        minZoom={0.1}
                        maxZoom={2}
                        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                    >
                        <Controls className="!bg-slate-800 !border-slate-600 !rounded-lg" />
                        <MiniMap
                            className="!bg-slate-800 !border-slate-600 !rounded-lg"
                            nodeColor={(node) => node.data?.color || '#6B7280'}
                        />
                        <Background color="#334155" gap={20} />
                    </ReactFlow>
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
