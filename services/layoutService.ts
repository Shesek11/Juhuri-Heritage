/**
 * Family Tree Layout Service
 * 
 * Custom layout algorithm designed specifically for family trees.
 * Features:
 * - Couples are placed side by side horizontally
 * - Children are centered below their parents
 * - Uses a recursive approach to calculate subtree widths
 */

import { Node, Edge, Position } from 'reactflow';

// Layout constants
const NODE_WIDTH = 160;
const NODE_HEIGHT = 100;
const COUPLE_GAP = 30;  // Gap between spouses
const SIBLING_GAP = 40; // Gap between siblings
const LEVEL_GAP = 120;  // Vertical gap between generations

export interface FamilyMemberData {
    id: number;
    first_name: string;
    last_name?: string;
    gender: 'male' | 'female' | 'other';
    birth_date?: string;
    photo_url?: string;
}

export interface ParentChildRel {
    parent_id: number;
    child_id: number;
}

export interface PartnershipRel {
    person1_id: number;
    person2_id: number;
}

interface TreeNode {
    id: number;
    member: FamilyMemberData;
    spouseId?: number;
    children: TreeNode[];
    x: number;
    y: number;
    subtreeWidth: number;
}

/**
 * Main layout function
 */
export function layoutFamilyTree(
    members: FamilyMemberData[],
    parentChild: ParentChildRel[],
    partnerships: PartnershipRel[]
): { nodes: Node[]; edges: Edge[] } {
    console.log('[Layout] Input - members:', members?.length, 'parentChild:', parentChild?.length, 'partnerships:', partnerships?.length);

    if (!members || members.length === 0) {
        return { nodes: [], edges: [] };
    }

    // Build lookup maps
    const memberMap = new Map<number, FamilyMemberData>();
    members.forEach(m => memberMap.set(m.id, m));

    // Build parent -> children map
    const childrenMap = new Map<number, number[]>();
    const hasParent = new Set<number>();

    parentChild.forEach(pc => {
        const children = childrenMap.get(pc.parent_id) || [];
        if (!children.includes(pc.child_id)) {
            children.push(pc.child_id);
        }
        childrenMap.set(pc.parent_id, children);
        hasParent.add(pc.child_id);
    });

    // Build spouse map
    const spouseMap = new Map<number, number>();
    partnerships.forEach(p => {
        spouseMap.set(p.person1_id, p.person2_id);
        spouseMap.set(p.person2_id, p.person1_id);
    });

    // Find root nodes (people without parents)
    const roots: number[] = [];
    const processedInCouple = new Set<number>();

    members.forEach(m => {
        if (!hasParent.has(m.id) && !processedInCouple.has(m.id)) {
            roots.push(m.id);
            // If this person has a spouse, mark the spouse as processed
            const spouseId = spouseMap.get(m.id);
            if (spouseId !== undefined) {
                processedInCouple.add(spouseId);
            }
        }
    });

    // If no roots found (circular or all have parents), just use first member
    if (roots.length === 0 && members.length > 0) {
        roots.push(members[0].id);
    }

    // Build tree structure recursively
    const builtIds = new Set<number>();

    function buildTree(memberId: number): TreeNode | null {
        if (builtIds.has(memberId)) return null;

        const member = memberMap.get(memberId);
        if (!member) return null;

        builtIds.add(memberId);

        const spouseId = spouseMap.get(memberId);
        if (spouseId !== undefined) {
            builtIds.add(spouseId);
        }

        // Get children from both this person and spouse
        const allChildIds = new Set<number>();
        (childrenMap.get(memberId) || []).forEach(c => allChildIds.add(c));
        if (spouseId !== undefined) {
            (childrenMap.get(spouseId) || []).forEach(c => allChildIds.add(c));
        }

        const children: TreeNode[] = [];
        allChildIds.forEach(childId => {
            const childNode = buildTree(childId);
            if (childNode) {
                children.push(childNode);
            }
        });

        return {
            id: memberId,
            member: member,
            spouseId: spouseId,
            children: children,
            x: 0,
            y: 0,
            subtreeWidth: 0
        };
    }

    const trees: TreeNode[] = [];
    roots.forEach(rootId => {
        const tree = buildTree(rootId);
        if (tree) trees.push(tree);
    });

    // Calculate subtree widths
    function calculateWidth(node: TreeNode): number {
        const hasSpouse = node.spouseId !== undefined;
        const coupleWidth = hasSpouse ? (NODE_WIDTH * 2 + COUPLE_GAP) : NODE_WIDTH;

        if (node.children.length === 0) {
            node.subtreeWidth = coupleWidth;
            return coupleWidth;
        }

        let childrenWidth = 0;
        node.children.forEach((child, i) => {
            childrenWidth += calculateWidth(child);
            if (i < node.children.length - 1) {
                childrenWidth += SIBLING_GAP;
            }
        });

        node.subtreeWidth = Math.max(coupleWidth, childrenWidth);
        return node.subtreeWidth;
    }

    trees.forEach(tree => calculateWidth(tree));

    // Position nodes
    function positionTree(node: TreeNode, startX: number, y: number) {
        const hasSpouse = node.spouseId !== undefined;
        const coupleWidth = hasSpouse ? (NODE_WIDTH * 2 + COUPLE_GAP) : NODE_WIDTH;

        // Center the couple above children
        const coupleX = startX + (node.subtreeWidth - coupleWidth) / 2;
        node.x = coupleX;
        node.y = y;

        // Position children
        let childX = startX;
        node.children.forEach(child => {
            positionTree(child, childX, y + LEVEL_GAP);
            childX += child.subtreeWidth + SIBLING_GAP;
        });
    }

    let currentX = 0;
    trees.forEach(tree => {
        positionTree(tree, currentX, 0);
        currentX += tree.subtreeWidth + 100; // Gap between separate family trees
    });

    // Convert to ReactFlow nodes and edges
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const processedNodes = new Set<number>();

    function createNodes(treeNode: TreeNode) {
        if (processedNodes.has(treeNode.id)) return;
        processedNodes.add(treeNode.id);

        const member = treeNode.member;
        const color = member.gender === 'male' ? '#3B82F6' :
            member.gender === 'female' ? '#EC4899' : '#6B7280';

        // Main person node
        nodes.push({
            id: `person-${treeNode.id}`,
            type: 'familyMember',
            position: { x: treeNode.x, y: treeNode.y },
            data: {
                member: member,
                color: color
            },
            sourcePosition: Position.Bottom,
            targetPosition: Position.Top
        });

        // Spouse node if exists
        if (treeNode.spouseId !== undefined) {
            const spouse = memberMap.get(treeNode.spouseId);
            if (spouse && !processedNodes.has(treeNode.spouseId)) {
                processedNodes.add(treeNode.spouseId);
                const spouseColor = spouse.gender === 'male' ? '#3B82F6' :
                    spouse.gender === 'female' ? '#EC4899' : '#6B7280';

                nodes.push({
                    id: `person-${treeNode.spouseId}`,
                    type: 'familyMember',
                    position: { x: treeNode.x + NODE_WIDTH + COUPLE_GAP, y: treeNode.y },
                    data: {
                        member: spouse,
                        color: spouseColor
                    },
                    sourcePosition: Position.Bottom,
                    targetPosition: Position.Top
                });

                // Add marriage edge (horizontal line between spouses)
                edges.push({
                    id: `marriage-${treeNode.id}-${treeNode.spouseId}`,
                    source: `person-${treeNode.id}`,
                    target: `person-${treeNode.spouseId}`,
                    sourceHandle: 'spouse-left',
                    targetHandle: 'spouse-right',
                    type: 'straight',
                    style: { stroke: '#F472B6', strokeWidth: 3 }
                });
            }
        }

        // Child edges
        treeNode.children.forEach(child => {
            // Connect from middle of couple (or single parent) to child
            const sourceId = treeNode.spouseId !== undefined
                ? `person-${treeNode.id}` // Could also create a virtual "couple" node
                : `person-${treeNode.id}`;

            edges.push({
                id: `parent-${treeNode.id}-child-${child.id}`,
                source: sourceId,
                target: `person-${child.id}`,
                sourceHandle: 'child-out',
                targetHandle: 'parent-in',
                type: 'smoothstep',
                style: { stroke: '#94A3B8', strokeWidth: 2 }
            });

            createNodes(child);
        });
    }

    trees.forEach(tree => createNodes(tree));

    console.log('[Layout] Output - nodes:', nodes.length, 'edges:', edges.length);
    console.log('[Layout] Edge IDs:', edges.map(e => e.id));

    return { nodes, edges };
}
