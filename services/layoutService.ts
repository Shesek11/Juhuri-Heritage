import dagre from 'dagre';
import { Node, Edge } from 'reactflow';
import { FamilyMember } from './familyService';

// Try to import ELK, but provide fallback if it fails
let ELK: any = null;
let elk: any = null;

try {
    // Dynamic import to prevent build failures
    ELK = require('elkjs/lib/elk.bundled.js');
    elk = new ELK();
} catch (e) {
    console.warn('ELK layout engine not available, using Dagre fallback');
}

// ELK Layout Options
const DEFAULT_LAYOUT_OPTIONS: Record<string, string> = {
    'elk.algorithm': 'layered',
    'elk.direction': 'DOWN',
    'elk.spacing.nodeNode': '50',
    'elk.layered.spacing.nodeNodeBetweenLayers': '100',
    'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    'elk.edgeRouting': 'ORTHOGONAL',
};

// Dagre fallback layout
const layoutWithDagre = (nodes: Node[], edges: Edge[]): { nodes: Node[], edges: Edge[] } => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 80 });

    const nodeWidth = 160;
    const nodeHeight = 100;

    nodes.forEach(node => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    // Parent-Child edges
    edges.forEach(edge => {
        if (!edge.id.startsWith('part-')) {
            dagreGraph.setEdge(edge.source, edge.target);
        }
    });

    // Partnership edges with virtual child
    edges.forEach(edge => {
        if (edge.id.startsWith('part-')) {
            const virtualId = `virtual-${edge.source}-${edge.target}`;
            dagreGraph.setNode(virtualId, { width: 1, height: 1 });
            dagreGraph.setEdge(edge.source, virtualId, { weight: 50 });
            dagreGraph.setEdge(edge.target, virtualId, { weight: 50 });
        }
    });

    dagre.layout(dagreGraph);

    const newNodes = nodes.map(node => {
        const pos = dagreGraph.node(node.id);
        return {
            ...node,
            position: { x: pos.x - nodeWidth / 2, y: pos.y - nodeHeight / 2 }
        };
    });

    const newEdges = edges.map(edge => {
        if (edge.id.startsWith('part-')) {
            const src = newNodes.find(n => n.id === edge.source);
            const tgt = newNodes.find(n => n.id === edge.target);
            if (src && tgt) {
                return src.position.x < tgt.position.x
                    ? { ...edge, sourceHandle: 'right', targetHandle: 'left-target' }
                    : { ...edge, sourceHandle: 'left', targetHandle: 'right-target' };
            }
        }
        return edge;
    });

    return { nodes: newNodes, edges: newEdges };
};

// ELK layout with clustering
const layoutWithELK = async (nodes: Node[], edges: Edge[]): Promise<{ nodes: Node[], edges: Edge[] }> => {
    if (!elk) {
        return layoutWithDagre(nodes, edges);
    }

    const partnerMap = new Map<string, Set<string>>();
    const allNodeIds = new Set(nodes.map(n => n.id));

    edges.forEach(e => {
        if (e.id.startsWith('part-')) {
            if (!partnerMap.has(e.source)) partnerMap.set(e.source, new Set());
            if (!partnerMap.has(e.target)) partnerMap.set(e.target, new Set());
            partnerMap.get(e.source)?.add(e.target);
            partnerMap.get(e.target)?.add(e.source);
        }
    });

    const clusters: { id: string; members: string[] }[] = [];
    const visited = new Set<string>();

    nodes.forEach(node => {
        if (visited.has(node.id)) return;
        const partners = partnerMap.get(node.id);
        if (partners && partners.size > 0) {
            const clusterMembers = new Set<string>();
            const queue = [node.id];
            while (queue.length > 0) {
                const current = queue.shift()!;
                if (clusterMembers.has(current)) continue;
                clusterMembers.add(current);
                visited.add(current);
                partnerMap.get(current)?.forEach(pId => {
                    if (!visited.has(pId)) queue.push(pId);
                });
            }
            clusters.push({
                id: `cluster-${Array.from(clusterMembers).sort().join('-')}`,
                members: Array.from(clusterMembers)
            });
        }
    });

    const elkNodes: any[] = [];
    const memberToClusterId = new Map<string, string>();

    clusters.forEach(cluster => {
        let pivotId = cluster.members[0];
        let maxDegree = 0;
        cluster.members.forEach(mId => {
            const degree = partnerMap.get(mId)?.size || 0;
            if (degree > maxDegree) { maxDegree = degree; pivotId = mId; }
        });

        const others = cluster.members.filter(m => m !== pivotId).sort();
        const mid = Math.floor(others.length / 2);
        const ordered = [...others.slice(0, mid), pivotId, ...others.slice(mid)];

        cluster.members.forEach(mId => memberToClusterId.set(mId, cluster.id));

        elkNodes.push({
            id: cluster.id,
            children: ordered.map(mId => ({ id: mId, width: 160, height: 100 })),
            layoutOptions: {
                'elk.algorithm': 'layered',
                'elk.direction': 'RIGHT',
                'elk.spacing.nodeNode': '40',
            }
        });
    });

    nodes.forEach(node => {
        if (!memberToClusterId.has(node.id)) {
            elkNodes.push({ id: node.id, width: 160, height: 100 });
        }
    });

    const elkEdges: any[] = [];
    edges.forEach(edge => {
        if (!edge.id.startsWith('part-')) {
            elkEdges.push({ id: edge.id, sources: [edge.source], targets: [edge.target] });
        }
    });

    const graph = {
        id: 'root',
        layoutOptions: DEFAULT_LAYOUT_OPTIONS,
        children: elkNodes,
        edges: elkEdges
    };

    const layoutedGraph = await elk.layout(graph);
    const layoutedNodes: Node[] = [];

    const processNode = (elkNode: any, parentX = 0, parentY = 0): void => {
        const x = parentX + (elkNode.x || 0);
        const y = parentY + (elkNode.y || 0);
        if (allNodeIds.has(elkNode.id)) {
            const orig = nodes.find(n => n.id === elkNode.id);
            if (orig) layoutedNodes.push({ ...orig, position: { x, y } });
        }
        elkNode.children?.forEach((child: any) => processNode(child, x, y));
    };

    layoutedGraph.children?.forEach((child: any) => processNode(child));

    const layoutedEdges = edges.map(edge => {
        if (edge.id.startsWith('part-')) {
            const src = layoutedNodes.find(n => n.id === edge.source);
            const tgt = layoutedNodes.find(n => n.id === edge.target);
            if (src && tgt) {
                return src.position.x < tgt.position.x
                    ? { ...edge, sourceHandle: 'right', targetHandle: 'left-target' }
                    : { ...edge, sourceHandle: 'left', targetHandle: 'right-target' };
            }
        }
        return edge;
    });

    return { nodes: layoutedNodes, edges: layoutedEdges };
};

// Main export - tries ELK first, falls back to Dagre
export const layoutElements = async (
    nodes: Node[],
    edges: Edge[],
    members: FamilyMember[]
): Promise<{ nodes: Node[], edges: Edge[] }> => {
    try {
        return await layoutWithELK(nodes, edges);
    } catch (err) {
        console.error('ELK layout failed, using Dagre fallback:', err);
        return layoutWithDagre(nodes, edges);
    }
};
