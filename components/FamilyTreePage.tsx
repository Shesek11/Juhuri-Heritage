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
import { User, Plus, TreeDeciduous, Pencil, Heart, Link, UserPlus } from 'lucide-react';
import { AddMemberModal } from './family/AddMemberModal';
import { EditMemberModal } from './family/EditMemberModal';
import { RelationshipManager } from './family/RelationshipManager';
import { AddRelativeModal } from './family/AddRelativeModal';

// Types for tree data
interface TreeData {
    members: FamilyMember[];
    parentChild: { parent_id: number; child_id: number; relationship_type: string }[];
    partnerships: { person1_id: number; person2_id: number; status: string }[];
}

// Custom Node Component
const MemberNode = ({ data }: { data: FamilyMember & { label: string; isOwner: boolean; onAddRelative: (type: any) => void } }) => {
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

            <div className="text-xs font-bold text-center text-slate-800">{displayName}</div>
            <div className="text-[10px] text-slate-500 text-center">{displayLastName}</div>
            {data.nickname && (
                <div className="text-[9px] text-amber-600 mt-0.5">"{data.nickname}"</div>
            )}
            {data.birth_date && (
                <div className="text-[9px] text-slate-400 mt-1">
                    {data.birth_date.substring(0, 4)}
                    {!data.is_alive && data.death_date && ` - ${data.death_date.substring(0, 4)}`}
                </div>
            )}

            {data.isOwner && (
                <>
                    <div className="absolute -top-2 -right-2 bg-amber-500 text-white rounded-full p-1 z-10" title="ניתן לערוך">
                        <Pencil size={10} />
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            data.onAddRelative(null);
                        }}
                        className="absolute -top-2 -left-2 bg-emerald-500 text-white rounded-full p-1 hover:bg-emerald-600 transition-colors shadow-sm z-50"
                        title="הוסף קרוב משפחה"
                    >
                        <UserPlus size={10} />
                    </button>
                </>
            )}

            <Handle type="source" position={Position.Bottom} id="bottom" className="w-16 !bg-slate-300" />
            <Handle type="source" position={Position.Left} id="left" className="!bg-pink-400" />
            <Handle type="target" position={Position.Right} id="right" className="!bg-pink-400" />
        </div>
    );
};

const nodeTypes = {
    member: MemberNode,
};

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: 160, height: 120 });
    });

    edges.forEach((edge) => {
        if (edge.type === 'straight') {
            // Partnership edge: Use dummy node trick to force same rank/horizontal alignment
            const dummyId = `__dummy_${edge.source}_${edge.target}`;
            dagreGraph.setNode(dummyId, { width: 1, height: 1 });
            dagreGraph.setEdge(edge.source, dummyId, { weight: 0, minlen: 1 });
            dagreGraph.setEdge(edge.target, dummyId, { weight: 0, minlen: 1 });
            // Also connect dummy to parents? No, just connecting them to a shared node often aligns them.
            // Actually, connecting them TO the dummy makes the dummy a child. 
            // Better: Dummy is parent of both? 
            // If dummy -> Source and dummy -> Target, they are siblings. Siblings are same rank.
            // Let's try: Dummy -> Source, Dummy -> Target.
            // BUT edge.source might already have parents.
            // If we add another parent (Dummy), Dagre handles multiple parents well.
        } else {
            dagreGraph.setEdge(edge.source, edge.target);
        }
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = isHorizontal ? Position.Left : Position.Top;
        node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

        node.position = {
            x: nodeWithPosition.x - 80,
            y: nodeWithPosition.y - 60,
        };

        return node;
    });

    return { nodes, edges };
};

export const FamilyTreePage: React.FC = () => {
    const { isEnabled } = useFeatureFlag('family_tree_module');
    const { user } = useAuth();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isRelationshipModalOpen, setIsRelationshipModalOpen] = useState(false);
    const [isAddRelativeModalOpen, setIsAddRelativeModalOpen] = useState(false);
    const [addRelativeType, setAddRelativeType] = useState<'parent' | 'child' | 'spouse' | null>(null);
    const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
    const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);

    useEffect(() => {
        if (isEnabled) {
            loadTree();
        }
    }, [isEnabled]);

    const loadTree = async () => {
        try {
            setLoading(true);
            const treeData = await familyService.getTreeData();

            const members = treeData.members || [];
            const parentChildRels = treeData.parentChild || [];
            const partnerships = treeData.partnerships || [];

            setAllMembers(members);

            const initialNodes: Node[] = [];
            const initialEdges: Edge[] = [];

            // Create nodes for all members
            members.forEach(member => {
                if (!member.id) return;
                const isOwner = String(user?.id) === String(member.user_id) || user?.role === 'admin';
                initialNodes.push({
                    id: member.id.toString(),
                    type: 'member',
                    data: {
                        ...member,
                        label: `${member.first_name} ${member.last_name}`,
                        isOwner,
                        onAddRelative: (type: 'parent' | 'child' | 'spouse' | null) => {
                            setSelectedMember(member);
                            setAddRelativeType(type);
                            setIsAddRelativeModalOpen(true);
                        }
                    },
                    position: { x: 0, y: 0 }
                });
            });

            // Create edges from parent-child relationships
            parentChildRels.forEach(rel => {
                const edgeStyle = rel.relationship_type === 'biological'
                    ? {}
                    : { strokeDasharray: '5 5' }; // Dashed for non-biological

                initialEdges.push({
                    id: `pc-${rel.parent_id}-${rel.child_id}`,
                    source: rel.parent_id.toString(),
                    target: rel.child_id.toString(),
                    type: 'smoothstep',
                    animated: rel.relationship_type === 'biological',
                    style: edgeStyle,
                    label: rel.relationship_type !== 'biological' ? getRelTypeLabel(rel.relationship_type) : undefined
                });
            });

            // Fallback: use legacy father_id/mother_id if no parentChild relations
            if (parentChildRels.length === 0) {
                members.forEach(member => {
                    if (member.father_id) {
                        initialEdges.push({
                            id: `e${member.father_id}-${member.id}`,
                            source: member.father_id.toString(),
                            target: member.id!.toString(),
                            type: 'smoothstep',
                            animated: true
                        });
                    }
                    if (member.mother_id) {
                        initialEdges.push({
                            id: `e${member.mother_id}-${member.id}`,
                            source: member.mother_id.toString(),
                            target: member.id!.toString(),
                            type: 'smoothstep',
                            animated: true,
                            style: { stroke: '#f472b6' }
                        });
                    }
                });
            }

            // Add partnership edges (horizontal spousal connections)
            partnerships.forEach(p => {
                initialEdges.push({
                    id: `sp-${p.person1_id}-${p.person2_id}`,
                    source: p.person1_id.toString(),
                    target: p.person2_id.toString(),
                    sourceHandle: 'left',
                    targetHandle: 'right',
                    type: 'straight',
                    style: { stroke: '#ec4899', strokeWidth: 2 },
                    label: '💕'
                });
            });

            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                initialNodes,
                initialEdges
            );

            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
        } catch (err) {
            console.error('Failed to load tree:', err);
        } finally {
            setLoading(false);
        }
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
            <div className="absolute top-4 right-4 z-10 flex gap-2" dir="rtl">
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur p-2 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                    <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <TreeDeciduous className="text-emerald-600" />
                        שורשים
                    </h1>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-emerald-700"
                >
                    <Plus size={16} className="inline ml-1" /> הוסף בן משפחה
                </button>
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
                        nodeTypes={nodeTypes}
                        fitView
                        attributionPosition="bottom-left"
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
        </div>
    );
};
