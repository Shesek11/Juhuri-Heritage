import ELK, { ElkNode, ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';
import { Node, Edge, Position } from 'reactflow';
import { FamilyMember } from './familyService';

const elk = new ELK();

// Layout Options
const DEFAULT_LAYOUT_OPTIONS = {
    'elk.algorithm': 'layered',
    'elk.direction': 'DOWN',
    'elk.spacing.nodeNode': '50', // Horizontal gap
    'elk.layered.spacing.nodeNodeBetweenLayers': '80', // Vertical gap
    'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    'elk.edgeRouting': 'ORTHOGONAL',
    // 'elk.layered.mergeEdges': 'true', // Helps clean up multiple lines
    'org.eclipse.elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
};

const CLUSTER_LAYOUT_OPTIONS = {
    'elk.algorithm': 'box', // Or 'layered' with RIGHT direction
    'elk.direction': 'RIGHT',
    'elk.spacing.nodeNode': '30', // Gap between partners
    'elk.padding': '[top=10,left=10,bottom=10,right=10]',
};

export const layoutElements = async (nodes: any[], edges: any[], members: FamilyMember[]) => {
    // 1. Identify Clusters (Partnerships)
    // We want to group people who are partners into a single "Couple/Family" node for the layout
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

    const clusters: { id: string, members: string[] }[] = [];
    const visited = new Set<string>();

    nodes.forEach(node => {
        if (visited.has(node.id)) return;

        const partners = partnerMap.get(node.id);
        if (partners && partners.size > 0) {
            // BFS/DFS to find connected component of partners (A-B-C)
            const clusterMembers = new Set<string>();
            const queue = [node.id];

            while (queue.length > 0) {
                const current = queue.shift()!;
                if (clusterMembers.has(current)) continue;

                clusterMembers.add(current);
                visited.add(current);

                const myPartners = partnerMap.get(current);
                myPartners?.forEach(pId => {
                    if (!visited.has(pId)) queue.push(pId);
                });
            }

            // NOTE: Sorting members to put shared pivot in middle?
            // ELK Box layout will just place them. We might need 'layered' inside with constraints for that.
            // For now, simple list.
            clusters.push({
                id: `cluster-${Array.from(clusterMembers).join('-')}`,
                members: Array.from(clusterMembers)
            });
        }
    });

    // 2. Build ELK Graph
    // Nodes that are in a cluster become children of a compound node
    // Nodes without partners are top-level nodes

    const elkNodes: ElkNode[] = [];
    const memberToClusterId = new Map<string, string>();

    // Create Cluster Nodes
    clusters.forEach(cluster => {
        const children: ElkNode[] = cluster.members.map(mId => ({
            id: mId,
            width: 160,
            height: 100,
            // layoutOptions: { 'elk.portConstraints': 'FIXED_SIDE' }
        }));

        cluster.members.forEach(mId => memberToClusterId.set(mId, cluster.id));

        elkNodes.push({
            id: cluster.id,
            children: children,
            layoutOptions: {
                'elk.algorithm': 'layered',
                'elk.direction': 'RIGHT',
                'elk.spacing.nodeNode': '40', // Distance between partners
                'elk.padding': '[top=10,left=10,bottom=10,right=10]'
            }
        });
    });

    // Add standalone nodes
    nodes.forEach(node => {
        if (!memberToClusterId.has(node.id)) {
            elkNodes.push({
                id: node.id,
                width: 160,
                height: 100
            });
        }
    });

    // 3. Build ELK Edges
    const elkEdges: ElkExtendedEdge[] = [];
    const processedPartnerships = new Set<string>();

    // A. Cluster Internal Edges (Forcing Linear Layout)
    clusters.forEach(cluster => {
        // Find Pivot (node with most partners in this cluster)
        let pivotId = cluster.members[0];
        let maxDegree = 0;

        cluster.members.forEach(mId => {
            let degree = 0;
            const partners = partnerMap.get(mId);
            if (partners) {
                partners.forEach(p => {
                    if (cluster.members.includes(p)) degree++;
                });
            }
            if (degree > maxDegree) {
                maxDegree = degree;
                pivotId = mId;
            }
        });

        const partners = cluster.members.filter(m => m !== pivotId);
        // Split into "Left" and "Right" groups to center the pivot
        const midPoint = Math.ceil(partners.length / 2);
        const leftSide = partners.slice(0, midPoint);
        const rightSide = partners.slice(midPoint);

        // Edges pointing TO pivot (will be placed to Left of pivot in RIGHT-directed layout)
        leftSide.forEach(pId => {
            elkEdges.push({
                id: `part-internal-${pId}-${pivotId}`,
                sources: [pId],
                targets: [pivotId],
                layoutOptions: { 'elk.edgeRouting': 'STRAIGHT' }
            });
            processedPartnerships.add([pId, pivotId].sort().join('-'));
        });

        // Edges pointing FROM pivot (will be placed to Right of pivot)
        rightSide.forEach(pId => {
            elkEdges.push({
                id: `part-internal-${pivotId}-${pId}`,
                sources: [pivotId],
                targets: [pId],
                layoutOptions: { 'elk.edgeRouting': 'STRAIGHT' }
            });
            processedPartnerships.add([pivotId, pId].sort().join('-'));
        });

        // Handle edges between non-pivots? (Rare in star topology, but possible triangle)
        // If triangle, one edge dominates.
    });

    // B. Main Graph Edges
    edges.forEach(edge => {
        const isPartnership = edge.id.startsWith('part-');

        if (isPartnership) {
            // Check if we already handled this as an internal edge
            const key = [edge.source, edge.target].sort().join('-');
            // If not processed (e.g. cross-cluster? shouldn't happen) or if we need to ensure the ID matches for ReactFlow
            // We DON'T add it to ELK again if we created specific directional edges above.
            // BUT, we need to ensure the ReactFlow edge matches the geometry.
        } else {
            // Parent-Child edge
            elkEdges.push({
                id: edge.id,
                sources: [edge.source],
                targets: [edge.target]
            });
        }
    });

    const graph: ElkNode = {
        id: 'root',
        layoutOptions: DEFAULT_LAYOUT_OPTIONS,
        children: elkNodes,
        edges: elkEdges
    };

    // 4. Run Layout
    try {
        const layoutedGraph = await elk.layout(graph);

        // 5. Flatten & Map back to React Flow
        const layoutedNodes: Node[] = [];

        const processNode = (elkNode: ElkNode, parentX = 0, parentY = 0) => {
            const currentX = parentX + (elkNode.x || 0);
            const currentY = parentY + (elkNode.y || 0);

            // If it's a real member node (leaf)
            if (allNodeIds.has(elkNode.id)) {
                const originalNode = nodes.find(n => n.id === elkNode.id);
                if (originalNode) {
                    layoutedNodes.push({
                        ...originalNode,
                        position: { x: currentX, y: currentY }
                    });
                }
            }

            // Recurse for children (clusters)
            if (elkNode.children) {
                elkNode.children.forEach(child => processNode(child, currentX, currentY));
            }
        };

        if (layoutedGraph.children) {
            layoutedGraph.children.forEach(child => processNode(child));
        }

        // 6. Update Edges (Add handles if needed)
        // For partnership edges, we can calculate logical side handles since we know the geometry now.
        const layoutedEdges = edges.map(edge => {
            if (edge.id.startsWith('part-')) {
                const source = layoutedNodes.find(n => n.id === edge.source);
                const target = layoutedNodes.find(n => n.id === edge.target);
                if (source && target) {
                    if (source.position.x < target.position.x) {
                        return { ...edge, sourceHandle: 'right', targetHandle: 'left' };
                    } else {
                        return { ...edge, sourceHandle: 'left', targetHandle: 'right' };
                    }
                }
            }
            return edge; // Parent-child keep default top/bottom
        });

        return { nodes: layoutedNodes, edges: layoutedEdges };

    } catch (err) {
        console.error('ELK Layout Failed:', err);
        return { nodes, edges }; // Fallback
    }
};
