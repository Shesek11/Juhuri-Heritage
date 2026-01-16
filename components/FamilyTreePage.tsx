import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    Node,
    Edge,
    Position,
    Handle
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { familyService, FamilyMember } from '../services/familyService';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { useAuth } from '../contexts/AuthContext';
import { User, Plus, TreeDeciduous, Pencil, Heart, Link, UserPlus, Users, Search, X, Loader2, Network, Trash2, LayoutGrid } from 'lucide-react';
import { AddMemberModal } from './family/AddMemberModal';
import { EditMemberModal } from './family/EditMemberModal';
import { RelationshipManager } from './family/RelationshipManager';
import { AddRelativeModal } from './family/AddRelativeModal';
import { CommunityRequests } from './family/CommunityRequests';
import { GedcomTools } from './family/GedcomTools';
import { ConnectNodesModal } from './family/ConnectNodesModal';

// Types for tree data
interface TreeData {
    members: FamilyMember[];
    parentChild: { parent_id: number; child_id: number; relationship_type: string }[];
    partnerships: { person1_id: number; person2_id: number; status: string }[];
}

// Custom Node Component
const MemberNode = ({ data }: { data: FamilyMember & { label: string; isOwner: boolean; onAddRelative: (type: any) => void; onDelete: (id: number) => void } }) => {
    const getStyles = () => {
        switch (data.gender) {
            case 'male': return { border: 'border-blue-200', bg: 'bg-blue-100', iconColor: 'text-blue-400' };
            case 'female': return { border: 'border-pink-200', bg: 'bg-pink-100', iconColor: 'text-pink-400' };
            default: return { border: 'border-gray-200', bg: 'bg-gray-100', iconColor: 'text-gray-400' };
        }
    };

    const styles = getStyles();
    const displayName = data.title ? `${data.title} ${data.first_name}` : data.first_name;
    const displayLastName = data.maiden_name ? `${data.last_name} (${data.maiden_name})` : data.last_name;

    return (
        <div className={`px-4 py-2 shadow-md rounded-md bg-white border-2 w-[160px] flex flex-col items-center hover:shadow-lg transition-shadow cursor-pointer relative ${styles.border} ${data.isOwner ? 'ring-2 ring-amber-400' : ''}`}>
            <Handle type="target" position={Position.Top} className="w-16 !bg-slate-300" />

            {data.photo_url ? (
                <img
                    src={data.photo_url}
                    className="w-12 h-12 rounded-full object-cover mb-2 border border-slate-100 shadow-sm"
                    alt={data.first_name}
                />
            ) : (
                <div className={`w-12 h-12 rounded-full ${styles.bg} flex items-center justify-center mb-2 ${styles.iconColor}`}>
                    <User size={24} strokeWidth={2.5} />
                </div>
            )}

            <div className="text-center w-full">
                <div className="font-bold text-slate-800 truncate text-sm" title={`${displayName} ${displayLastName}`}>
                    {displayName}
                </div>
                <div className="text-xs text-slate-600 truncate">
                    {displayLastName}
                </div>
                {data.birth_date && (
                    <div className="text-[10px] text-slate-400 mt-1">
                        {new Date(data.birth_date).getFullYear()}
                    </div>
                )}
            </div>

            {/* Quick Actions (Hover) */}
            <div className="absolute top-0 right-0 p-1 opacity-0 hover:opacity-100 transition-opacity flex gap-1">
                {data.isOwner && (
                    <>
                        <div className="bg-amber-500 text-white rounded-full p-0.5 shadow-sm" title="ניתן לעריכה">
                            <Pencil size={8} />
                        </div>
                        <div
                            className="bg-red-500 text-white rounded-full p-0.5 shadow-sm cursor-pointer hover:bg-red-600"
                            title="מחק פרופיל"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`האם אתה בטוח שברצונך למחוק את ${data.first_name}? פעולה זו תסיר גם את הקשרים.`)) {
                                    data.onDelete(data.id);
                                }
                            }}
                        >
                            <Trash2 size={8} />
                        </div>
                    </>
                )}
            </div>

            <Handle type="source" position={Position.Bottom} className="w-16 !bg-slate-300" />

            {/* Quick Add Button */}
            {data.isOwner && (
                <div
                    className="absolute -top-3 -right-3 bg-emerald-500 text-white rounded-full p-1 shadow-md hover:bg-emerald-600 hover:scale-110 transition-all z-10"
                    title="הוסף קרוב משפחה"
                    onClick={(e) => {
                        e.stopPropagation();
                        data.onAddRelative('child'); // Default to adding child
                    }}
                >
                    <UserPlus size={12} />
                </div>
            )}
        </div>
    );
};

const nodeTypes = {
    member: MemberNode,
};

export const FamilyTreePage: React.FC = () => {
    const { isEnabled } = useFeatureFlag('family_tree');
    const { user } = useAuth();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading] = useState(true);

    // Modals State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isRelationshipModalOpen, setIsRelationshipModalOpen] = useState(false);
    const [isAddRelativeModalOpen, setIsAddRelativeModalOpen] = useState(false);
    const [addRelativeType, setAddRelativeType] = useState<'parent' | 'child' | 'spouse' | null>(null);
    const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
    const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);
    const [isCommunityModalOpen, setIsCommunityModalOpen] = useState(false);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<FamilyMember[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

    // Connection State
    const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
    const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
    const [connectTargetId, setConnectTargetId] = useState<string | null>(null);

    useEffect(() => {
        if (isEnabled) {
            loadTree();
        }
    }, [isEnabled]);

    // Debounced Search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length >= 2) {
                setIsSearching(true);
                try {
                    const results = await familyService.searchMembers(searchQuery);
                    setSearchResults(results);
                    setShowSearchResults(true);
                } catch (err) {
                    console.error('Search failed:', err);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
                setShowSearchResults(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSearchResultClick = (memberId: string) => {
        const node = nodes.find(n => n.id === memberId);
        if (node && reactFlowInstance) {
            reactFlowInstance.setCenter(node.position.x, node.position.y, { zoom: 1.5, duration: 800 });
            setSearchQuery('');
            setShowSearchResults(false);
        } else {
            console.log('Node not found on map');
        }
    };

    const loadTree = async () => {
        try {
            setLoading(true);
            const data: TreeData = await familyService.getTreeData();
            setAllMembers(data.members || []);

            const layoutedElements = getLayoutedElements(
                // Convert members to nodes
                (data.members || []).map((m) => ({
                    id: m.id.toString(),
                    type: 'member',
                    data: {
                        ...m,
                        label: m.first_name,
                        isOwner: user?.id === m.user_id?.toString() || (user as any)?.role === 'admin',
                        onAddRelative: (type: any) => {
                            setSelectedMember(m);
                            setAddRelativeType(type);
                            setIsAddRelativeModalOpen(true);
                        },
                        onDelete: handleDeleteNode
                    },
                    position: { x: 0, y: 0 },
                })),
                // Create edges from all relationship types
                [
                    // Parent-Child edges
                    ...(data.parentChild || []).map((pc) => ({
                        id: `pc-${pc.parent_id}-${pc.child_id}`,
                        source: pc.parent_id.toString(),
                        target: pc.child_id.toString(),
                        type: 'smoothstep',
                        style: { stroke: pc.relationship_type === 'biological' ? '#94a3b8' : '#94a3b8', strokeWidth: 2, strokeDasharray: pc.relationship_type === 'biological' ? undefined : '5,5' },
                        // label: relationship labels can be noisy
                    })),
                    // Partnership edges
                    ...(data.partnerships || []).map((p) => ({
                        id: `part-${p.person1_id}-${p.person2_id}`,
                        source: p.person1_id.toString(),
                        target: p.person2_id.toString(),
                        type: 'straight', // Partnership is usually beside
                        style: { stroke: '#ec4899', strokeWidth: 3 },
                        animated: false,
                        label: p.status === 'divorced' ? '💔' : '❤️',
                        labelStyle: { fill: '#ec4899', fontWeight: 700 },
                        labelBgStyle: { fill: 'white', fillOpacity: 0.7 }
                    }))
                ]
            );

            setNodes(layoutedElements.nodes);
            setEdges(layoutedElements.edges);
        } catch (error) {
            console.error('Failed to load tree:', error);
        } finally {
            setLoading(false);
        }
    };

    const onConnect = useCallback((params: any) => {
        if (params.source && params.target && params.source !== params.target) {
            setConnectSourceId(params.source);
            setConnectTargetId(params.target);
            setIsConnectModalOpen(true);
        }
    }, []);

    const handleDeleteNode = useCallback(async (id: number) => {
        try {
            await familyService.deleteMember(id);
            loadTree(); // Reload to refresh
        } catch (error) {
            console.error('Failed to delete member:', error);
            alert('שגיאה במחיקת בן משפחה');
        }
    }, []);

    const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
        const dagreGraph = new dagre.graphlib.Graph();
        dagreGraph.setDefaultEdgeLabel(() => ({}));

        const nodeWidth = 160;
        const nodeHeight = 100;

        dagreGraph.setGraph({ rankdir: 'TB' });

        nodes.forEach((node) => {
            dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
        });

        edges.forEach((edge) => {
            dagreGraph.setEdge(edge.source, edge.target);
        });

        dagre.layout(dagreGraph);

        nodes.forEach((node) => {
            const nodeWithPosition = dagreGraph.node(node.id);
            node.position = {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            };
        });

        return { nodes, edges };
    };

    const getRelTypeLabel = (type: string) => {
        switch (type) {
            case 'adopted': return 'מאומץ';
            case 'foster': return 'אומנה';
            case 'step': return 'חורג';
            default: return '';
        }
    };

    const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        const memberData = node.data as FamilyMember & { isOwner: boolean };
        if (memberData.isOwner) {
            const fullMember = allMembers.find(m => m.id?.toString() === node.id);
            if (fullMember) {
                setSelectedMember(fullMember);
                setIsEditModalOpen(true);
            }
        }
    }, [allMembers]);

    const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
        event.preventDefault();
        const memberData = node.data as FamilyMember & { isOwner: boolean };
        if (memberData.isOwner) {
            const fullMember = allMembers.find(m => m.id?.toString() === node.id);
            if (fullMember) {
                setSelectedMember(fullMember);
                setIsRelationshipModalOpen(true);
            }
        }
    }, [allMembers]);

    if (!isEnabled) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center min-h-[50vh]">
                <TreeDeciduous size={64} className="text-slate-300 mb-4" />
                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200">שורשים (בפיתוח)</h2>
                <p className="text-slate-500 mt-2">מודול אילן יוחסין יהיה זמין בקרוב!</p>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-80px)] flex flex-col relative" dir="ltr">
            {/* Header Overlay */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 items-end" dir="rtl">
                <div className="flex gap-4 items-center">
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur p-2 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <TreeDeciduous className="text-emerald-600" />
                            שורשים
                        </h1>
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-64">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="חפש בן משפחה..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-xl text-sm border-none shadow-lg focus:ring-2 focus:ring-emerald-500 bg-white/90 dark:bg-slate-800/90 backdrop-blur"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                            </div>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Search Results Dropdown */}
                        {showSearchResults && searchResults.length > 0 && (
                            <div className="absolute top-full text-right left-0 w-full mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 max-h-64 overflow-y-auto z-50 py-2">
                                {searchResults.map(member => (
                                    <button
                                        key={member.id}
                                        onClick={() => handleSearchResultClick(member.id.toString())}
                                        className="w-full px-4 py-2 text-right hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-600 flex items-center justify-center shrink-0 overflow-hidden">
                                            {member.photo_url ? (
                                                <img src={member.photo_url} className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={14} className="text-slate-400" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                                {member.first_name} {member.last_name}
                                            </div>
                                            {member.birth_date && (
                                                <div className="text-xs text-slate-500">
                                                    {new Date(member.birth_date).getFullYear()}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={loadTree}
                        className="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 px-3 py-2 rounded-xl text-sm font-bold shadow hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center gap-1"
                        title="סדר עץ מחדש"
                    >
                        <LayoutGrid size={16} />
                    </button>
                    <GedcomTools onSuccess={loadTree} />
                    <button
                        onClick={() => setIsCommunityModalOpen(true)}
                        className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-purple-700 flex items-center gap-1"
                    >
                        <Users size={16} /> בקשות קהילה
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-emerald-700"
                    >
                        <Plus size={16} className="inline ml-1" /> הוסף בן משפחה
                    </button>
                </div>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 right-4 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-3 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 text-xs" dir="rtl">
                <div className="font-bold mb-2">מקרא:</div>
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-0.5 bg-slate-400"></div>
                    <span>קשר הורה-ילד</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-0.5 border-t-2 border-dashed border-slate-400"></div>
                    <span>קשר לא ביולוגי</span>
                </div>
                <div className="flex items-center gap-2">
                    <Pencil size={12} className="text-amber-500" />
                    <span>ניתן לעריכה</span>
                </div>
            </div>

            {/* Help Text */}
            {user && (
                <div className="absolute top-4 left-4 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-3 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-500 space-y-1">
                    <div><Pencil size={12} className="inline text-amber-500 ml-1" /> לחץ שמאלי = עריכת פרטים</div>
                    <div><Link size={12} className="inline text-purple-500 ml-1" /> לחץ ימני = ניהול קשרים</div>
                    <div><Network size={12} className="inline text-blue-500 ml-1" /> גרירה בין נקודות = חיבור</div>
                </div>
            )}

            {loading ? (
                <div className="flex-1 flex items-center justify-center text-slate-400">טוען עץ משפחה...</div>
            ) : nodes.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <TreeDeciduous size={48} className="mb-4 opacity-50" />
                    <p>העץ ריק. היה הראשון להוסיף שורשים!</p>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="mt-4 bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold"
                    >
                        יצירת עץ חדש
                    </button>
                </div>
            ) : (
                <div className="flex-1 w-full h-full">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onNodeClick={handleNodeClick}
                        onNodeContextMenu={handleNodeContextMenu}
                        onConnect={onConnect}
                        nodeTypes={nodeTypes}
                        fitView
                        attributionPosition="bottom-left"
                        minZoom={0.1}
                    >
                        <Controls />
                        <MiniMap />
                        <Background gap={12} size={1} />
                    </ReactFlow>
                </div>
            )}

            <AddMemberModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={loadTree}
            />

            <EditMemberModal
                isOpen={isEditModalOpen}
                member={selectedMember}
                onClose={() => {
                    setIsEditModalOpen(false);
                    // Keep selectedMember for AddRelativeModal
                }}
                onSuccess={loadTree}
                onAddRelative={(type) => {
                    setIsEditModalOpen(false);
                    setAddRelativeType(type);
                    setIsAddRelativeModalOpen(true);
                }}
            />

            <RelationshipManager
                isOpen={isRelationshipModalOpen}
                member={selectedMember}
                allMembers={allMembers}
                onClose={() => {
                    setIsRelationshipModalOpen(false);
                    setSelectedMember(null);
                }}
                onSuccess={loadTree}
            />

            <AddRelativeModal
                isOpen={isAddRelativeModalOpen}
                relativeTo={selectedMember}
                relationType={addRelativeType}
                onClose={() => {
                    setIsAddRelativeModalOpen(false);
                    setAddRelativeType(null);
                    setSelectedMember(null);
                }}
                onSuccess={loadTree}
            />

            <CommunityRequests
                isOpen={isCommunityModalOpen}
                onClose={() => setIsCommunityModalOpen(false)}
                onSuccess={loadTree}
            />

            <ConnectNodesModal
                isOpen={isConnectModalOpen}
                sourceNodeId={connectSourceId}
                targetNodeId={connectTargetId}
                allMembers={allMembers}
                onClose={() => {
                    setIsConnectModalOpen(false);
                    setConnectSourceId(null);
                    setConnectTargetId(null);
                }}
                onSuccess={loadTree}
            />
        </div>
    );
};
