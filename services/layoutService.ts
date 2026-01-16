import ELK from 'elkjs/lib/elk.bundled.js';
import type { ElkNode, ElkExtendedEdge } from 'elkjs';
import { Node, Edge } from 'reactflow';
import { FamilyMember } from './familyService';

const elk = new ELK();

// Layout Options for the main graph
const DEFAULT_LAYOUT_OPTIONS: Record<string, string> = {
    'elk.algorithm': 'layered',
    'elk.direction': 'DOWN',
    'elk.spacing.nodeNode': '50',
    'elk.layered.spacing.nodeNodeBetweenLayers': '100',
    'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    'elk.edgeRouting': 'ORTHOGONAL',
    'org.eclipse.elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
};

export const layoutElements = async (nodes: Node[], edges: Edge[], members: FamilyMember[]): Promise<{ nodes: Node[], edges: Edge[] }> => {
    // 1. Identify Partnership Clusters
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

                const myPartners = partnerMap.get(current);
                myPartners?.forEach(pId => {
                    if (!visited.has(pId)) queue.push(pId);
                });
            }

            clusters.push({
                id: `cluster-${Array.from(clusterMembers).sort().join('-')}`,
                members: Array.from(clusterMembers)
            });
        }
    });

    // 2. Build ELK Graph
    const elkNodes: ElkNode[] = [];
    const memberToClusterId = new Map<string, string>();

    // Create Cluster Compound Nodes
    clusters.forEach(cluster => {
        // Find pivot (most connected node in cluster)
        let pivotId = cluster.members[0];
        let maxDegree = 0;
        cluster.members.forEach(mId => {
            const degree = partnerMap.get(mId)?.size || 0;
            if (degree > maxDegree) {
                maxDegree = degree;
                pivotId = mId;
            }
        });

        // Order: others sorted, pivot in middle
        const others = cluster.members.filter(m => m !== pivotId).sort();
        const midPoint = Math.floor(others.length / 2);
        const orderedMembers = [...others.slice(0, midPoint), pivotId, ...others.slice(midPoint)];

        const children: ElkNode[] = orderedMembers.map(mId => ({
            id: mId,
            width: 160,
            height: 100,
        }));

        cluster.members.forEach(mId => memberToClusterId.set(mId, cluster.id));

        elkNodes.push({
            id: cluster.id,
            children: children,
            layoutOptions: {
                'elk.algorithm': 'layered',
                'elk.direction': 'RIGHT',
                'elk.spacing.nodeNode': '40',
                'elk.padding': '[top=10,left=10,bottom=10,right=10]'
            }
        });
    });

    // Add standalone nodes (no partners)
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

    // Intra-cluster edges (force linear ordering)
    clusters.forEach(cluster => {
        for (let i = 0; i < cluster.members.length - 1; i++) {
            const from = cluster.members[i];
            const to = cluster.members[i + 1];
            // Check if they are actually partners
            if (partnerMap.get(from)?.has(to)) {
                elkEdges.push({
                    id: `elk-part-${from}-${to}`,
                    sources: [from],
                    targets: [to],
                });
            }
        }
    });

    // Parent-Child edges
    edges.forEach(edge => {
        if (!edge.id.startsWith('part-')) {
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

        const processNode = (elkNode: ElkNode, parentX = 0, parentY = 0): void => {
            const currentX = parentX + (elkNode.x || 0);
            const currentY = parentY + (elkNode.y || 0);

            if (allNodeIds.has(elkNode.id)) {
                const originalNode = nodes.find(n => n.id === elkNode.id);
                if (originalNode) {
                    layoutedNodes.push({
                        ...originalNode,
                        position: { x: currentX, y: currentY }
                    });
                }
            }

            if (elkNode.children) {
                elkNode.children.forEach(child => processNode(child, currentX, currentY));
            }
        };

        if (layoutedGraph.children) {
            layoutedGraph.children.forEach(child => processNode(child));
        }

        // 6. Update Edges with correct handles
        const layoutedEdges = edges.map(edge => {
            if (edge.id.startsWith('part-')) {
                const source = layoutedNodes.find(n => n.id === edge.source);
                const target = layoutedNodes.find(n => n.id === edge.target);
                if (source && target) {
                    if (source.position.x < target.position.x) {
                        return { ...edge, sourceHandle: 'right', targetHandle: 'left-target' };
                    } else {
                        return { ...edge, sourceHandle: 'left', targetHandle: 'right-target' };
                    }
                }
            }
            return edge;
        });

        return { nodes: layoutedNodes, edges: layoutedEdges };

    } catch (err) {
        console.error('ELK Layout Failed:', err);
        // Fallback: return original positions
        return { nodes, edges };
    }
};
