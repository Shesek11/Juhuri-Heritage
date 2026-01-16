import dagre from 'dagre';
import { Node, Edge, Position } from 'reactflow';
import { FamilyMember } from './familyService';

export const layoutElements = async (nodes: Node[], edges: Edge[], members: FamilyMember[]) => {
    // Falls back to Dagre layout since ELK installation failed
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const nodeWidth = 160;
    const nodeHeight = 100;

    dagreGraph.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 80 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    // 1. Add Parent-Child edges (Hierarchical)
    edges.forEach((edge) => {
        if (!edge.id.startsWith('part-')) {
            dagreGraph.setEdge(edge.source, edge.target);
        }
    });

    // 2. Handle Partnerships (Force same rank via Virtual Child)
    edges.forEach((edge) => {
        if (edge.id.startsWith('part-')) {
            const partnerA = edge.source;
            const partnerB = edge.target;
            const virtualNodeId = `virtual-child-${partnerA}-${partnerB}`;
            dagreGraph.setNode(virtualNodeId, { width: 1, height: 1, label: '' });
            dagreGraph.setEdge(partnerA, virtualNodeId, { minlen: 1, weight: 50, label: '' });
            dagreGraph.setEdge(partnerB, virtualNodeId, { minlen: 1, weight: 50, label: '' });
        }
    });

    dagre.layout(dagreGraph);

    // --- Post-Processing: Center Pivot Nodes (Multi-Partners) ---
    const partnershipEdges = edges.filter(e => e.id.startsWith('part-'));
    const partnerMap = new Map<string, string[]>();

    partnershipEdges.forEach(e => {
        if (!partnerMap.has(e.source)) partnerMap.set(e.source, []);
        if (!partnerMap.has(e.target)) partnerMap.set(e.target, []);
        partnerMap.get(e.source)?.push(e.target);
        partnerMap.get(e.target)?.push(e.source);
    });

    // Helper to shift a node and its exclusive vertical line
    const shiftVerticalSubtree = (rootId: string, dx: number, direction: 'up' | 'down', visited = new Set<string>()) => {
        if (visited.has(rootId) || dx === 0) return;
        visited.add(rootId);

        const node = dagreGraph.node(rootId);
        if (node) node.x += dx;

        const relevantEdges = edges.filter(e =>
            !e.id.startsWith('part-') &&
            (direction === 'up' ? e.target === rootId : e.source === rootId)
        );

        relevantEdges.forEach(edge => {
            const neighborId = direction === 'up' ? edge.source : edge.target;
            const neighborConnections = edges.filter(e =>
                !e.id.startsWith('part-') &&
                (direction === 'up' ? e.source === neighborId : e.target === neighborId)
            );
            if (neighborConnections.length === 1) {
                shiftVerticalSubtree(neighborId, dx, direction, visited);
            }
        });
    };

    const processedClusters = new Set<string>();

    nodes.forEach(node => {
        const partners = partnerMap.get(node.id) || [];
        if (partners.length > 1 && !processedClusters.has(node.id)) {
            const clusterIds = [node.id, ...partners];
            clusterIds.forEach(id => processedClusters.add(id));

            const clusterNodes = clusterIds.map(id => {
                const dNode = dagreGraph.node(id);
                return { id, x: dNode.x, width: dNode.width };
            }).sort((a, b) => a.x - b.x);

            const currentPivotIndex = clusterNodes.findIndex(n => n.id === node.id);
            const desiredPivotIndex = Math.floor(clusterNodes.length / 2);

            if (currentPivotIndex !== -1 && currentPivotIndex !== desiredPivotIndex) {
                const pivotNode = clusterNodes[currentPivotIndex];
                const targetNode = clusterNodes[desiredPivotIndex];
                const dxPivot = targetNode.x - pivotNode.x;
                const dxTarget = pivotNode.x - targetNode.x;

                shiftVerticalSubtree(pivotNode.id, dxPivot, 'up');
                shiftVerticalSubtree(pivotNode.id, dxPivot, 'down');
                shiftVerticalSubtree(targetNode.id, dxTarget, 'up');
                shiftVerticalSubtree(targetNode.id, dxTarget, 'down');
            }
        }
    });

    // Map definitions
    const newNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        if (nodeWithPosition) {
            node.position = {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            };
        }
        return node;
    });

    const newEdges = edges.map((edge) => {
        if (edge.id.startsWith('part-')) {
            const sourceNode = newNodes.find(n => n.id === edge.source);
            const targetNode = newNodes.find(n => n.id === edge.target);
            if (sourceNode && targetNode) {
                if (sourceNode.position.x < targetNode.position.x) {
                    return { ...edge, sourceHandle: 'right', targetHandle: 'left-target' };
                } else {
                    return { ...edge, sourceHandle: 'left', targetHandle: 'right-target' };
                }
            }
        }
        return edge;
    });

    return { nodes: newNodes, edges: newEdges };
};
