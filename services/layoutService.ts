import dagre from 'dagre';
import { Node, Edge } from 'reactflow';
import { FamilyMember } from './familyService';

// Try to import ELK
let ELK: any = null;
let elk: any = null;

try {
    ELK = require('elkjs/lib/elk.bundled.js');
    elk = new ELK();
} catch (e) {
    console.warn('ELK not available, using Dagre');
}

// Dagre layout with improved partner/child handling
const layoutWithDagre = (nodes: Node[], edges: Edge[]): { nodes: Node[], edges: Edge[] } => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 100, marginx: 20, marginy: 20 });

    const nodeWidth = 160;
    const nodeHeight = 100;

    // Build partner clusters
    const partnerMap = new Map<string, Set<string>>();
    edges.forEach(e => {
        if (e.id.startsWith('part-')) {
            if (!partnerMap.has(e.source)) partnerMap.set(e.source, new Set());
            if (!partnerMap.has(e.target)) partnerMap.set(e.target, new Set());
            partnerMap.get(e.source)!.add(e.target);
            partnerMap.get(e.target)!.add(e.source);
        }
    });

    // Find clusters (connected partners)
    const clusters: string[][] = [];
    const visited = new Set<string>();

    nodes.forEach(node => {
        if (visited.has(node.id)) return;
        const partners = partnerMap.get(node.id);
        if (partners && partners.size > 0) {
            const cluster: string[] = [];
            const queue = [node.id];
            while (queue.length > 0) {
                const curr = queue.shift()!;
                if (visited.has(curr)) continue;
                visited.add(curr);
                cluster.push(curr);
                partnerMap.get(curr)?.forEach(p => {
                    if (!visited.has(p)) queue.push(p);
                });
            }
            clusters.push(cluster);
        }
    });

    // Create virtual "couple" nodes for each cluster
    const clusterMap = new Map<string, string>(); // member -> clusterId
    const clusterCenters = new Map<string, string[]>(); // clusterId -> members

    clusters.forEach((cluster, idx) => {
        const clusterId = `couple-${idx}`;
        cluster.forEach(m => clusterMap.set(m, clusterId));
        clusterCenters.set(clusterId, cluster);
        // Add virtual couple node (will be used for child connections)
        dagreGraph.setNode(clusterId, { width: nodeWidth * cluster.length + 40 * (cluster.length - 1), height: nodeHeight });
    });

    // Add individual nodes
    nodes.forEach(node => {
        if (!clusterMap.has(node.id)) {
            dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
        }
    });

    // Add parent-child edges (connect to cluster if parent is in one)
    edges.forEach(edge => {
        if (!edge.id.startsWith('part-')) {
            const sourceCluster = clusterMap.get(edge.source);
            const targetCluster = clusterMap.get(edge.target);

            // Source is parent, target is child
            const effectiveSource = sourceCluster || edge.source;
            const effectiveTarget = targetCluster || edge.target;

            dagreGraph.setEdge(effectiveSource, effectiveTarget);
        }
    });

    dagre.layout(dagreGraph);

    // Position individual nodes within their clusters
    const newNodes = nodes.map(node => {
        const clusterId = clusterMap.get(node.id);

        if (clusterId) {
            // Node is part of a cluster
            const clusterPos = dagreGraph.node(clusterId);
            const clusterMembers = clusterCenters.get(clusterId)!;
            const memberIndex = clusterMembers.indexOf(node.id);
            const totalWidth = nodeWidth * clusterMembers.length + 40 * (clusterMembers.length - 1);
            const startX = clusterPos.x - totalWidth / 2;

            return {
                ...node,
                position: {
                    x: startX + memberIndex * (nodeWidth + 40),
                    y: clusterPos.y - nodeHeight / 2
                }
            };
        } else {
            // Standalone node
            const pos = dagreGraph.node(node.id);
            return {
                ...node,
                position: {
                    x: pos.x - nodeWidth / 2,
                    y: pos.y - nodeHeight / 2
                }
            };
        }
    });

    // Update edge handles
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

// Main export
export const layoutElements = async (
    nodes: Node[],
    edges: Edge[],
    members: FamilyMember[]
): Promise<{ nodes: Node[], edges: Edge[] }> => {
    try {
        // Use improved Dagre for now (more reliable for family trees)
        return layoutWithDagre(nodes, edges);
    } catch (err) {
        console.error('Layout failed:', err);
        return { nodes, edges };
    }
};
