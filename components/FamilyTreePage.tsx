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
import { User, Search, Plus, TreeDeciduous } from 'lucide-react';
import { AddMemberModal } from './family/AddMemberModal';

// Custom Node Component
const MemberNode = ({ data }: { data: FamilyMember & { label: string } }) => {
    return (
        <div className={`px-4 py-2 shadow-md rounded-md bg-white border-2 w-[150px] flex flex-col items-center
            ${data.gender === 'male' ? 'border-blue-200' : data.gender === 'female' ? 'border-pink-200' : 'border-gray-200'}
        `}>
            <Handle type="target" position={Position.Top} className="w-16 !bg-slate-300" />

            {data.photo_url ? (
                <img src={data.photo_url} className="w-12 h-12 rounded-full object-cover mb-2 border border-slate-100" />
            ) : (
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2 text-slate-400">
                    <User size={20} />
                </div>
            )}

            <div className="text-xs font-bold text-center">{data.first_name}</div>
            <div className="text-[10px] text-slate-500 text-center">{data.last_name}</div>
            {data.birth_date && (
                <div className="text-[9px] text-slate-400 mt-1">{data.birth_date.substring(0, 4)}</div>
            )}

            <Handle type="source" position={Position.Bottom} className="w-16 !bg-slate-300" />
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
        dagreGraph.setNode(node.id, { width: 150, height: 100 });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = isHorizontal ? Position.Left : Position.Top;
        node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

        node.position = {
            x: nodeWithPosition.x - 75,
            y: nodeWithPosition.y - 50,
        };

        return node;
    });

    return { nodes, edges };
};

export const FamilyTreePage: React.FC = () => {
    const { isEnabled } = useFeatureFlag('family_tree_module');
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        if (isEnabled) {
            loadTree();
        }
    }, [isEnabled]);

    const loadTree = async () => {
        try {
            setLoading(true);
            const rawData = await familyService.getTreeData();

            const initialNodes: Node[] = [];
            const initialEdges: Edge[] = [];

            rawData.forEach(member => {
                if (!member.id) return;
                initialNodes.push({
                    id: member.id.toString(),
                    type: 'member',
                    data: { ...member, label: `${member.first_name} ${member.last_name}` },
                    position: { x: 0, y: 0 }
                });

                if (member.father_id) {
                    initialEdges.push({
                        id: `e${member.father_id}-${member.id}`,
                        source: member.father_id.toString(),
                        target: member.id.toString(),
                        type: 'smoothstep',
                        animated: true
                    });
                }
                if (member.mother_id) {
                    initialEdges.push({
                        id: `e${member.mother_id}-${member.id}`,
                        source: member.mother_id.toString(),
                        target: member.id.toString(),
                        type: 'smoothstep',
                        animated: true,
                        style: { stroke: '#f472b6' }
                    });
                }
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
        </div>
    );
};
