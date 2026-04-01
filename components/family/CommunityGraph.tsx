/**
 * CommunityGraph.tsx
 * D3.js Force-Directed Graph for Community Family Visualization
 * Shows all members as nodes with relationships as edges
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { forceSimulation, forceLink, forceManyBody, forceX, forceY, forceCollide } from 'd3-force';
import type { Simulation, SimulationNodeDatum, ForceLink, ForceY } from 'd3-force';
import { zoom, zoomIdentity, zoomTransform } from 'd3-zoom';
import type { ZoomBehavior } from 'd3-zoom';
import { select } from 'd3-selection';
import { drag } from 'd3-drag';
import type { D3DragEvent } from 'd3-drag';
import { easeQuadOut, easeCubicInOut } from 'd3-ease';
import { useTranslations } from 'next-intl';
import { SEOHead } from '../seo/SEOHead';
import 'd3-transition';
import { familyService, FamilyMember } from '../../services/familyService';
import { EditMemberModal } from './EditMemberModal';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, ZoomIn, ZoomOut, Maximize2, UserPlus, Link2, X, Search, Network, Info, Eye, Sliders, User } from 'lucide-react';

interface GraphNode extends SimulationNodeDatum {
    id: number;
    name: string;
    nameRu?: string;
    gender: 'male' | 'female' | 'other';
    birthYear?: number;
    birthPlace?: string;
    currentResidence?: string;
    maidenName?: string;
    previousName?: string;
    isAlive?: boolean;
    family?: string;
    generation?: number;  // 0 = oldest ancestor, higher = younger generation
    isJunction?: boolean;  // Virtual junction node for connecting parent pairs to children
}

interface GraphEdge {
    source: number | GraphNode;
    target: number | GraphNode;
    type: 'parent-child' | 'spouse' | 'sibling';
    status?: string; // For spouse: married, divorced, widowed
}

type ConnectionMode = 'none' | 'connecting' | 'selecting-type';
type RelationshipType = 'parent-child' | 'spouse' | 'sibling';

export const CommunityGraph: React.FC = () => {
    const t = useTranslations('family');
    const tc = useTranslations('common');
    const { user } = useAuth();
    const currentUserId = user?.id;
    const isAdmin = user?.role === 'admin';
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [loading, setLoading] = useState(true);
    const [nodes, setNodes] = useState<GraphNode[]>([]);
    const [edges, setEdges] = useState<GraphEdge[]>([]);
    const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);
    const [showLegend, setShowLegend] = useState(false);
    const [showControls, setShowControls] = useState(false);

    // Force simulation parameters (with sliders)
    const [forceParams, setForceParams] = useState({
        parentChildStrength: 1.00,
        spouseStrength: 1.00,
        charge: -650,
        parentChildDistance: 50,
        spouseDistance: 30,
        collisionRadius: 50,
        yForceStrength: 1.00
    });

    // Layout parameters (tunable via debug panel)
    const [layoutParams, setLayoutParams] = useState({
        nodeSpacing: 80,
        coupleGap: 55,
        familyGap: 120,
        yearPx: 10,
        minGap: 90,
        collisionRadius: 40,
        snapBack: 0.3,
        overlapRounds: 3,
    });

    // Edit modal state
    const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    // Pending relationship: when adding a relative from the edit modal
    const [pendingRelation, setPendingRelation] = useState<{
        fromMemberId: number;
        type: 'parent' | 'child' | 'spouse';
    } | null>(null);

    // Connection mode state
    const [connectionMode, setConnectionMode] = useState<ConnectionMode>('none');
    const [firstSelectedNode, setFirstSelectedNode] = useState<GraphNode | null>(null);
    const [secondSelectedNode, setSecondSelectedNode] = useState<GraphNode | null>(null);

    // Tooltip state
    const [tooltip, setTooltip] = useState<{
        visible: boolean;
        x: number;
        y: number;
        flipped: boolean; // true = show below circle
        member: FamilyMember | null;
    }>({ visible: false, x: 0, y: 0, flipped: false, member: null });

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<GraphNode[]>([]);

    // Zoom ref for controls
    const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

    // Pulsing animation control
    const pulsingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Edge hover pulsing intervals (for continuous pulsing on hover)
    const edgeHoverIntervalsRef = useRef<NodeJS.Timeout[]>([]);

    // Node hover pulsing intervals (for first-degree relatives)
    const nodeHoverIntervalsRef = useRef<NodeJS.Timeout[]>([]);

    // Simulation ref for real-time parameter updates
    const simulationRef = useRef<Simulation<GraphNode, undefined> | null>(null);

    // Load data
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await familyService.getTreeData();

            const members = data.members || [];
            const parentChild = data.parentChild || [];
            const partnerships = data.partnerships || [];

            setAllMembers(members);

            // Convert to graph nodes
            const graphNodes: GraphNode[] = members.map(m => ({
                id: m.id,
                name: `${m.first_name} ${m.last_name || ''}`.trim(),
                nameRu: (m.first_name_ru || m.last_name_ru) ? `${m.first_name_ru || ''} ${m.last_name_ru || ''}`.trim() : undefined,
                gender: m.gender || 'other',
                birthYear: m.birth_date ? new Date(m.birth_date).getFullYear() : undefined,
                birthPlace: m.birth_city || m.birth_place,
                currentResidence: m.residence_city || m.current_residence,
                maidenName: m.maiden_name,
                previousName: m.previous_name,
                isAlive: m.is_alive,
                family: m.last_name || 'Unknown'
            }));

            // Convert to graph edges WITH JUNCTION NODES
            const graphEdges: GraphEdge[] = [];
            const junctionNodes: GraphNode[] = [];
            let nextJunctionId = 1000000; // Start junction IDs from a high number

            // Build map of children to their parents
            const childToParentsMap = new Map<number, number[]>();
            parentChild.forEach((pc: any) => {
                if (!childToParentsMap.has(pc.child_id)) {
                    childToParentsMap.set(pc.child_id, []);
                }
                childToParentsMap.get(pc.child_id)!.push(pc.parent_id);
            });

            // Group children by their parent pairs (for shared junction nodes)
            const parentPairToChildren = new Map<string, number[]>();
            childToParentsMap.forEach((parents, childId) => {
                if (parents.length === 2) {
                    // Create a unique key for this parent pair (sorted to handle both orders)
                    const pairKey = [parents[0], parents[1]].sort((a, b) => a - b).join('-');
                    if (!parentPairToChildren.has(pairKey)) {
                        parentPairToChildren.set(pairKey, []);
                    }
                    parentPairToChildren.get(pairKey)!.push(childId);
                }
            });

            // Create junction nodes for parent pairs with shared children
            const createdJunctions = new Map<string, number>(); // pairKey → junctionId
            parentPairToChildren.forEach((childIds, pairKey) => {
                const [parent1Id, parent2Id] = pairKey.split('-').map(Number);

                // Create one junction node for this parent pair
                const junctionId = nextJunctionId++;

                // Position junction at average birth year of children
                const childrenBirthYears = childIds
                    .map(cid => members.find(m => m.id === cid)?.birth_date)
                    .filter(bd => bd)
                    .map(bd => new Date(bd!).getFullYear());
                const avgBirthYear = childrenBirthYears.length > 0
                    ? Math.round(childrenBirthYears.reduce((a, b) => a + b, 0) / childrenBirthYears.length)
                    : undefined;

                junctionNodes.push({
                    id: junctionId,
                    name: '',
                    gender: 'other',
                    birthYear: avgBirthYear,
                    isJunction: true
                });

                // Connect both parents to junction
                graphEdges.push({
                    source: parent1Id,
                    target: junctionId,
                    type: 'parent-child'
                });
                graphEdges.push({
                    source: parent2Id,
                    target: junctionId,
                    type: 'parent-child'
                });

                // Connect junction to all children of this parent pair
                childIds.forEach(childId => {
                    graphEdges.push({
                        source: junctionId,
                        target: childId,
                        type: 'parent-child'
                    });
                });

                createdJunctions.set(pairKey, junctionId);
            });

            // Handle children with single parent or 3+ parents (direct connections)
            childToParentsMap.forEach((parents, childId) => {
                if (parents.length === 2) {
                    // Already handled by junction nodes above
                    return;
                }

                // Single parent or 3+ parents - direct connections
                parents.forEach(parentId => {
                    graphEdges.push({
                        source: parentId,
                        target: childId,
                        type: 'parent-child'
                    });
                });
            });

            // Partnerships (spouse relationships)
            partnerships.forEach((p: any) => {
                graphEdges.push({
                    source: p.person1_id,
                    target: p.person2_id,
                    type: 'spouse',
                    status: p.status
                });
            });

            // Merge real nodes with junction nodes
            const allNodes = [...graphNodes, ...junctionNodes];

            setNodes(allNodes);
            setEdges(graphEdges);

            // Calculate generations based on parent-child relationships
            const childToParents = new Map<number, number[]>();
            graphEdges.filter(e => e.type === 'parent-child').forEach(e => {
                const childId = typeof e.target === 'number' ? e.target : e.target.id;
                const parentId = typeof e.source === 'number' ? e.source : e.source.id;
                if (!childToParents.has(childId)) childToParents.set(childId, []);
                childToParents.get(childId)!.push(parentId);
            });

            // Find roots (people with no parents)
            const hasParent = new Set(childToParents.keys());
            const roots = graphNodes.filter(n => !hasParent.has(n.id));

            // BFS to assign generations
            const generationMap = new Map<number, number>();
            roots.forEach(r => generationMap.set(r.id, 0));

            let changed = true;
            while (changed) {
                changed = false;
                graphEdges.filter(e => e.type === 'parent-child').forEach(e => {
                    const parentId = typeof e.source === 'number' ? e.source : e.source.id;
                    const childId = typeof e.target === 'number' ? e.target : e.target.id;
                    const parentGen = generationMap.get(parentId);
                    if (parentGen !== undefined) {
                        const currentChildGen = generationMap.get(childId);
                        const newGen = parentGen + 1;
                        if (currentChildGen === undefined || newGen > currentChildGen) {
                            generationMap.set(childId, newGen);
                            changed = true;
                        }
                    }
                });
            }

            // Propagate generation to spouses (spouse inherits partner's generation)
            graphEdges.filter(e => e.type === 'spouse').forEach(e => {
                const id1 = typeof e.source === 'number' ? e.source : e.source.id;
                const id2 = typeof e.target === 'number' ? e.target : e.target.id;
                const gen1 = generationMap.get(id1);
                const gen2 = generationMap.get(id2);
                if (gen1 !== undefined && gen2 === undefined) generationMap.set(id2, gen1);
                else if (gen2 !== undefined && gen1 === undefined) generationMap.set(id1, gen2);
                else if (gen1 !== undefined && gen2 !== undefined) {
                    // Both have generations — use the one with parents (more reliable)
                    const hasParents1 = childToParents.has(id1);
                    const hasParents2 = childToParents.has(id2);
                    if (hasParents1 && !hasParents2) generationMap.set(id2, gen1);
                    else if (hasParents2 && !hasParents1) generationMap.set(id1, gen2);
                }
            });

            // Assign generation to nodes
            graphNodes.forEach(n => {
                n.generation = generationMap.get(n.id) ?? 0;
            });

        } catch (error) {
            console.error('[CommunityGraph] Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Cleanup pulsing animation on unmount
    useEffect(() => {
        return () => {
            if (pulsingIntervalRef.current) {
                clearInterval(pulsingIntervalRef.current);
            }
        };
    }, []);

    // Update simulation forces in real-time when parameters change
    useEffect(() => {
        if (!simulationRef.current) return;

        const sim = simulationRef.current;

        // Update link force
        const linkForce = sim.force('link') as ForceLink<GraphNode, GraphEdge>;
        if (linkForce) {
            linkForce
                .distance(d => {
                    if (d.type === 'spouse') return forceParams.spouseDistance;
                    if (d.type === 'parent-child') return forceParams.parentChildDistance;
                    return 100;
                })
                .strength(d => {
                    if (d.type === 'spouse') return forceParams.spouseStrength;
                    if (d.type === 'parent-child') return forceParams.parentChildStrength;
                    return 0.5;
                });
        }

        // Update charge force
        sim.force('charge', forceManyBody().strength(forceParams.charge));

        // Update y-force
        const yForce = sim.force('y') as ForceY<GraphNode>;
        if (yForce) {
            yForce.strength(forceParams.yForceStrength);
        }

        // Update collision force
        sim.force('collision', forceCollide().radius(forceParams.collisionRadius));

        // Restart simulation with new parameters (higher alpha for better convergence)
        sim.alpha(0.5).restart();
    }, [forceParams]);

    // Highlight selected nodes in connection mode
    useEffect(() => {
        if (!svgRef.current || (!firstSelectedNode && !secondSelectedNode)) {
            // Clear all highlights if no node is selected
            if (svgRef.current) {
                select(svgRef.current)
                    .selectAll('g.node circle')
                    .attr('stroke-width', 3)
                    .attr('stroke', d => {
                        const nodeData = d as GraphNode;
                        return nodeData.gender === 'female' ? '#f59e0b' : '#6366f1';
                    });
            }
            return;
        }

        // Highlight the selected nodes
        const svg = select(svgRef.current);
        const graphContainer = svg.select('g.graph-container');

        // Reset all nodes first
        graphContainer.selectAll('g.node circle')
            .attr('stroke-width', 3)
            .attr('stroke', d => {
                const nodeData = d as GraphNode;
                return nodeData.gender === 'female' ? '#f59e0b' : '#6366f1';
            });

        // Highlight the first selected node
        if (firstSelectedNode) {
            const firstNodeGroup = graphContainer.select(`g.node[data-id="${firstSelectedNode.id}"]`);
            if (!firstNodeGroup.empty()) {
                firstNodeGroup.select('circle')
                    .attr('stroke-width', 5)
                    .attr('stroke', '#fbbf24'); // Amber highlight
            }
        }

        // Highlight the second selected node
        if (secondSelectedNode) {
            const secondNodeGroup = graphContainer.select(`g.node[data-id="${secondSelectedNode.id}"]`);
            if (!secondNodeGroup.empty()) {
                secondNodeGroup.select('circle')
                    .attr('stroke-width', 5)
                    .attr('stroke', '#10b981'); // Green highlight for second node
            }
        }
    }, [firstSelectedNode, secondSelectedNode]);

    // Build the D3 visualization
    useEffect(() => {
        if (loading || nodes.length === 0 || !svgRef.current || !containerRef.current) return;

        const svg = select(svgRef.current);
        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Wait for container to have valid dimensions
        if (width === 0 || height === 0) {
            console.warn('[CommunityGraph] Container dimensions not ready, retrying...');
            setTimeout(() => {
                // Trigger re-render by updating a state (the nodes array hasn't changed, so we need to force it)
                setNodes([...nodes]);
            }, 100);
            return;
        }

        // Clear previous
        svg.selectAll('*').remove();

        // Create main group for zoom/pan
        const g = svg.append('g').attr('class', 'graph-container');

        // Year labels group — stays fixed on X, Y updates per-label on zoom
        const yearLabelsGroup = svg.append('g').attr('class', 'year-labels');
        const yearMarkerData: { year: number; yPos: number }[] = [];

        // Setup zoom with error handling
        try {
            const zoomBehavior = zoom<SVGSVGElement, unknown>()
                .scaleExtent([0.1, 4])
                .on('zoom', (event) => {
                    g.attr('transform', event.transform);
                    // Update year labels: transform each label's Y using zoom, keep X fixed
                    yearLabelsGroup.selectAll<SVGGElement, { year: number; yPos: number }>('.year-label')
                        .attr('transform', d => {
                            const screenY = event.transform.applyY(d.yPos);
                            return `translate(8, ${screenY})`;
                        });
                    stopPulsing();
                });

            svg.call(zoomBehavior);
            zoomRef.current = zoomBehavior;
        } catch (error) {
            console.error('[CommunityGraph] Error initializing zoom:', error);
        }

        // ===== TREE LAYOUT (Reingold-Tilford variant for genealogy) =====
        const NODE_SPACING = layoutParams.nodeSpacing; // gap between sibling subtrees
        const COUPLE_GAP = layoutParams.coupleGap; // gap between spouses in a couple
        const padding = 80;
        const leftPadding = 60;

        // Y-axis: birth year → screen Y (shared timeline for all families)
        const years = nodes.filter(n => !n.isJunction && n.birthYear).map(n => n.birthYear!);
        const minYear = years.length > 0 ? Math.min(...years) : 1940;
        const maxYear = years.length > 0 ? Math.max(...years) : 2025;
        const yearSpan = Math.max(maxYear - minYear, 30);
        const YEAR_HEIGHT = Math.max(height, yearSpan * layoutParams.yearPx);
        const yearToY = (year: number) => padding + ((year - minYear) / yearSpan) * (YEAR_HEIGHT - 2 * padding);

        // Draw year markers: lines in graph group, labels fixed on right
        const startYear = Math.floor(minYear / 25) * 25;
        const endYear = Math.ceil(maxYear / 25) * 25;
        const yearData: { year: number; yPos: number }[] = [];
        for (let year = startYear; year <= endYear; year += 25) {
            const yPos = yearToY(year);
            yearData.push({ year, yPos });
            // Horizontal line (moves with graph)
            g.append('line')
                .attr('x1', -5000).attr('y1', yPos).attr('x2', 5000).attr('y2', yPos)
                .attr('stroke', 'rgba(255,255,255,0.06)')
                .attr('stroke-width', 1)
                .attr('pointer-events', 'none');
        }
        // Year labels — data-bound so zoom handler can update positions
        const labels = yearLabelsGroup.selectAll('.year-label')
            .data(yearData)
            .enter()
            .append('g')
            .attr('class', 'year-label')
            .attr('transform', d => `translate(8, ${d.yPos})`);
        labels.append('rect')
            .attr('x', 0).attr('y', -10).attr('width', 42).attr('height', 18)
            .attr('fill', 'rgba(15, 23, 42, 0.9)').attr('rx', 4).attr('pointer-events', 'none');
        labels.append('text')
            .attr('x', 21).attr('y', 4)
            .attr('font-size', '12px').attr('font-weight', '600')
            .attr('fill', 'rgba(255,255,255,0.4)').attr('text-anchor', 'middle')
            .attr('pointer-events', 'none')
            .text(d => d.year.toString());

        // Real nodes (skip junctions)
        const realNodes = nodes.filter(n => !n.isJunction);

        // Build lookup maps
        const spouseMap = new Map<number, number>();
        const childrenOfCouple = new Map<string, number[]>();
        const parentsOf = new Map<number, number[]>();

        edges.forEach(e => {
            const sId = typeof e.source === 'number' ? e.source : e.source.id;
            const tId = typeof e.target === 'number' ? e.target : e.target.id;
            if (e.type === 'spouse') {
                spouseMap.set(sId, tId);
                spouseMap.set(tId, sId);
            }
            if (e.type === 'parent-child') {
                if (!parentsOf.has(tId)) parentsOf.set(tId, []);
                parentsOf.get(tId)!.push(sId);
            }
        });

        parentsOf.forEach((parents, childId) => {
            const key = [...parents].sort((a, b) => a - b).join(',');
            if (!childrenOfCouple.has(key)) childrenOfCouple.set(key, []);
            childrenOfCouple.get(key)!.push(childId);
        });

        // ── Resolve real parents (bypass junctions) ──
        const realParentsOf = new Map<number, number[]>();
        realNodes.forEach(child => {
            const directParents = parentsOf.get(child.id) || [];
            const realParents: number[] = [];
            directParents.forEach(pid => {
                const pNode = nodes.find(n => n.id === pid);
                if (pNode?.isJunction) {
                    (parentsOf.get(pid) || []).forEach(gp => {
                        if (!nodes.find(n => n.id === gp)?.isJunction) realParents.push(gp);
                    });
                } else {
                    realParents.push(pid);
                }
            });
            if (realParents.length > 0) realParentsOf.set(child.id, realParents);
        });

        // ── Build FamilyUnit tree for Reingold-Tilford layout ──
        // A FamilyUnit = a couple (or single person) + their children as sub-units
        interface FamilyUnit {
            id: string;           // unique key
            members: GraphNode[]; // 1 or 2 people (couple)
            children: FamilyUnit[];
            subtreeWidth: number; // computed bottom-up
            x: number;            // center X of this unit
        }

        // Map: coupleKey → children IDs (using real parents)
        const coupleChildren = new Map<string, number[]>();
        realParentsOf.forEach((parents, childId) => {
            const key = [...parents].sort((a, b) => a - b).join(',');
            if (!coupleChildren.has(key)) coupleChildren.set(key, []);
            coupleChildren.get(key)!.push(childId);
        });

        // Track which nodes are placed in units
        const placed = new Set<number>();

        // Build unit for a couple/person and their descendants
        function buildUnit(memberIds: number[]): FamilyUnit | null {
            const members = memberIds.map(id => realNodes.find(n => n.id === id)).filter(Boolean) as GraphNode[];
            if (members.length === 0) return null;
            members.forEach(m => placed.add(m.id));
            // Also place their spouse if not already
            members.forEach(m => {
                const sId = spouseMap.get(m.id);
                if (sId && !memberIds.includes(sId)) {
                    const spouse = realNodes.find(n => n.id === sId);
                    if (spouse && !placed.has(sId)) {
                        members.push(spouse);
                        placed.add(sId);
                    }
                }
            });

            const coupleKey = members.length === 2
                ? [members[0].id, members[1].id].sort((a, b) => a - b).join(',')
                : String(members[0].id);

            // Find children of this couple
            const childIds = coupleChildren.get(coupleKey) || [];
            // Also check single-parent keys
            members.forEach(m => {
                const singleKey = String(m.id);
                (coupleChildren.get(singleKey) || []).forEach(cid => {
                    if (!childIds.includes(cid)) childIds.push(cid);
                });
            });

            // Group children into their own family units (with their spouses)
            const childUnits: FamilyUnit[] = [];
            childIds.sort((a, b) => {
                const aNode = realNodes.find(n => n.id === a);
                const bNode = realNodes.find(n => n.id === b);
                return (aNode?.birthYear ?? 0) - (bNode?.birthYear ?? 0);
            });
            childIds.forEach(cid => {
                if (placed.has(cid)) return;
                const childUnit = buildUnit([cid]);
                if (childUnit) childUnits.push(childUnit);
            });

            // Sort members: blood member first (has parents in tree), spouse second
            if (members.length === 2) {
                const aHasParents = realParentsOf.has(members[0].id);
                const bHasParents = realParentsOf.has(members[1].id);
                if (!aHasParents && bHasParents) members.reverse();
            }

            const unitWidth = members.length === 2 ? COUPLE_GAP : 0;

            return {
                id: coupleKey,
                members,
                children: childUnits,
                subtreeWidth: 0, // computed later
                x: 0,
            };
        }

        // Find root nodes (no parents) and build unit trees
        const roots = realNodes.filter(n => !realParentsOf.has(n.id) && !spouseMap.has(n.id) ||
            (!realParentsOf.has(n.id) && !placed.has(n.id)));

        // Better: find the actual tree roots (people with no parents)
        const hasRealParent = new Set<number>();
        realParentsOf.forEach((_, childId) => hasRealParent.add(childId));

        const rootCandidates = realNodes.filter(n => !hasRealParent.has(n.id));
        // Sort: oldest generation first (people with most descendants should be roots)
        rootCandidates.sort((a, b) => (a.generation ?? 0) - (b.generation ?? 0) || (a.birthYear ?? 9999) - (b.birthYear ?? 9999));
        // Group root candidates into couples
        const rootUnits: FamilyUnit[] = [];
        const rootPlaced = new Set<number>();
        rootCandidates.forEach(n => {
            if (rootPlaced.has(n.id) || placed.has(n.id)) return;
            rootPlaced.add(n.id);
            const sId = spouseMap.get(n.id);
            if (sId) rootPlaced.add(sId);
            const unit = buildUnit(sId ? [n.id, sId] : [n.id]);
            if (unit) rootUnits.push(unit);
        });

        // Pick up any unplaced nodes as standalone units
        realNodes.forEach(n => {
            if (placed.has(n.id)) return;
            placed.add(n.id);
            rootUnits.push({
                id: `solo-${n.id}`,
                members: [n],
                children: [],
                subtreeWidth: 0,
                x: 0,
            });
        });

        // ── Bottom-up: compute subtree widths ──
        function computeWidth(unit: FamilyUnit): number {
            const ownWidth = unit.members.length === 2 ? COUPLE_GAP : 0;
            if (unit.children.length === 0) {
                unit.subtreeWidth = Math.max(ownWidth, NODE_SPACING * 0.8);
                return unit.subtreeWidth;
            }
            // Children width = sum of child subtree widths + spacing between them
            const childrenTotalWidth = unit.children.reduce((sum, c) => sum + computeWidth(c), 0)
                + (unit.children.length - 1) * NODE_SPACING;
            unit.subtreeWidth = Math.max(ownWidth, childrenTotalWidth);
            return unit.subtreeWidth;
        }
        rootUnits.forEach(u => computeWidth(u));

        // ── Top-down: assign X positions ──
        function assignX(unit: FamilyUnit, centerX: number) {
            unit.x = centerX;
            // Place members centered at unit.x
            if (unit.members.length === 2) {
                unit.members[0].x = centerX - COUPLE_GAP / 2;
                unit.members[1].x = centerX + COUPLE_GAP / 2;
            } else if (unit.members.length === 1) {
                unit.members[0].x = centerX;
            }
            // Assign Y by birth year
            unit.members.forEach(m => {
                m.y = yearToY(m.birthYear ?? ((minYear + maxYear) / 2));
            });

            if (unit.children.length === 0) return;

            // Distribute children across the subtree width, centered under parent
            const childrenTotalWidth = unit.children.reduce((sum, c) => sum + c.subtreeWidth, 0)
                + (unit.children.length - 1) * NODE_SPACING;
            let childX = centerX - childrenTotalWidth / 2;

            unit.children.forEach(child => {
                const childCenter = childX + child.subtreeWidth / 2;
                assignX(child, childCenter);
                childX += child.subtreeWidth + NODE_SPACING;
            });
        }

        // Place root units side by side with FAMILY_GAP
        const FAMILY_GAP = layoutParams.familyGap;
        const totalRootWidth = rootUnits.reduce((sum, u) => sum + u.subtreeWidth, 0)
            + (rootUnits.length - 1) * FAMILY_GAP;
        let rootX = width / 2 - totalRootWidth / 2;

        rootUnits.forEach(unit => {
            const center = rootX + unit.subtreeWidth / 2;
            assignX(unit, center);
            rootX += unit.subtreeWidth + FAMILY_GAP;
        });

        // ── Center entire tree in viewport ──
        const allX = realNodes.filter(n => n.x != null).map(n => n.x!);
        if (allX.length > 0) {
            const treeCenter = (Math.min(...allX) + Math.max(...allX)) / 2;
            const shift = width / 2 - treeCenter;
            realNodes.forEach(n => { if (n.x != null) n.x! += shift; });
        }

        // ── Position junction nodes ──
        nodes.forEach(n => {
            if (!n.isJunction) return;
            const connectedReal = edges
                .filter(e => {
                    const sId = typeof e.source === 'number' ? e.source : e.source.id;
                    const tId = typeof e.target === 'number' ? e.target : e.target.id;
                    return sId === n.id || tId === n.id;
                })
                .map(e => {
                    const sId = typeof e.source === 'number' ? e.source : e.source.id;
                    const tId = typeof e.target === 'number' ? e.target : e.target.id;
                    return nodes.find(nd => nd.id === (sId === n.id ? tId : sId));
                })
                .filter(nd => nd && !nd.isJunction) as GraphNode[];

            if (connectedReal.length > 0) {
                const parents = connectedReal.filter(r => (r.generation ?? 0) < (n.generation ?? 0));
                const refNodes = parents.length > 0 ? parents : connectedReal;
                n.x = refNodes.reduce((sum, r) => sum + (r.x || 0), 0) / refNodes.length;
                n.y = (Math.min(...connectedReal.map(r => r.y || 0)) + Math.max(...connectedReal.map(r => r.y || 0))) / 2;
            } else {
                n.x = width / 2;
                n.y = padding;
            }
        });

        // ── No force simulation — layout is fully deterministic ──
        const simulation = forceSimulation<GraphNode>(nodes)
            .force('collision', forceCollide().radius(layoutParams.collisionRadius))
            .alpha(0.1)
            .alphaDecay(0.05)
            .velocityDecay(0.8);

        simulationRef.current = simulation;

        // Edge colors and styles - vibrant and clear
        const getEdgeColor = (d: GraphEdge) => {
            if (d.type === 'spouse') {
                if (d.status === 'divorced') return '#f87171'; // Red dashed
                if (d.status === 'widowed') return '#94a3b8'; // Gray dotted
                return '#f472b6'; // Pink for married
            }
            if (d.type === 'parent-child') return '#38bdf8'; // Sky blue
            if (d.type === 'sibling') return '#a78bfa'; // Purple
            return '#94a3b8';
        };

        const getEdgeDash = (d: GraphEdge) => {
            if (d.type === 'spouse') {
                if (d.status === 'divorced') return '8,4'; // Clear dashes for divorced
                if (d.status === 'widowed') return '4,4'; // Dotted for widowed
                return 'none'; // Solid for married
            }
            if (d.type === 'sibling') return '8,4'; // Long dash for siblings
            return 'none';
        };

        const getEdgeWidth = (d: GraphEdge) => {
            if (d.type === 'spouse') return 3.5; // Thicker for emphasis
            if (d.type === 'parent-child') return 3;
            if (d.type === 'sibling') return 2.5;
            return 2;
        };

        // Draw edges as paths with glow effect for better visibility
        const link = g.append('g')
            .attr('class', 'links')
            .selectAll('path')
            .data(edges)
            .enter()
            .append('path')
            .attr('stroke', d => getEdgeColor(d))
            .attr('stroke-width', d => getEdgeWidth(d))
            .attr('stroke-opacity', 0.85) // Higher opacity for clearer lines
            .attr('fill', 'none')
            .attr('stroke-dasharray', d => getEdgeDash(d))
            .attr('stroke-linecap', 'round')
            .style('filter', 'drop-shadow(0px 0px 2px rgba(0,0,0,0.3))')
            .style('cursor', 'pointer')
            .on('mouseenter', function (event, d: GraphEdge) {
                // Highlight the edge
                select(this)
                    .attr('stroke-opacity', 1)
                    .attr('stroke-width', getEdgeWidth(d) + 1);

                // Get connected nodes
                const sourceId = typeof d.source === 'number' ? d.source : d.source.id;
                const targetId = typeof d.target === 'number' ? d.target : d.target.id;

                // Find all real nodes connected (handling junction nodes)
                const connectedNodeIds: number[] = [];

                // Check source
                const sourceNode = nodes.find(n => n.id === sourceId);
                if (sourceNode?.isJunction) {
                    // Find all real nodes connected to this junction
                    edges.forEach(edge => {
                        const edgeSourceId = typeof edge.source === 'number' ? edge.source : edge.source.id;
                        const edgeTargetId = typeof edge.target === 'number' ? edge.target : edge.target.id;

                        if (edgeSourceId === sourceId) {
                            const targetNode = nodes.find(n => n.id === edgeTargetId);
                            if (targetNode && !targetNode.isJunction) connectedNodeIds.push(edgeTargetId);
                        }
                        if (edgeTargetId === sourceId) {
                            const sourceNode = nodes.find(n => n.id === edgeSourceId);
                            if (sourceNode && !sourceNode.isJunction) connectedNodeIds.push(edgeSourceId);
                        }
                    });
                } else {
                    connectedNodeIds.push(sourceId);
                }

                // Check target
                const targetNode = nodes.find(n => n.id === targetId);
                if (targetNode?.isJunction) {
                    // Find all real nodes connected to this junction
                    edges.forEach(edge => {
                        const edgeSourceId = typeof edge.source === 'number' ? edge.source : edge.source.id;
                        const edgeTargetId = typeof edge.target === 'number' ? edge.target : edge.target.id;

                        if (edgeSourceId === targetId) {
                            const targetNode = nodes.find(n => n.id === edgeTargetId);
                            if (targetNode && !targetNode.isJunction) connectedNodeIds.push(edgeTargetId);
                        }
                        if (edgeTargetId === targetId) {
                            const sourceNode = nodes.find(n => n.id === edgeSourceId);
                            if (sourceNode && !sourceNode.isJunction) connectedNodeIds.push(edgeSourceId);
                        }
                    });
                } else {
                    connectedNodeIds.push(targetId);
                }

                // Create continuous pulsing on all connected nodes
                connectedNodeIds.forEach(nodeId => {
                    const nodeGroup = g.select(`g.node[data-id="${nodeId}"]`);
                    if (!nodeGroup.empty()) {
                        const circle = nodeGroup.select('circle');

                        // Enlarge the node
                        circle.transition()
                            .duration(200)
                            .attr('r', 30);

                        // Create continuous pulsing
                        const createPulse = () => {
                            const ring = nodeGroup.insert('circle', ':first-child')
                                .attr('class', 'edge-hover-pulse')
                                .attr('r', 25)
                                .attr('fill', 'none')
                                .attr('stroke', '#f59e0b')
                                .attr('stroke-width', 3)
                                .attr('opacity', 0.8);

                            ring.transition()
                                .duration(1000)
                                .ease(easeQuadOut)
                                .attr('r', 50)
                                .attr('stroke-width', 1)
                                .attr('opacity', 0)
                                .remove();
                        };

                        // Start immediate pulse
                        createPulse();

                        // Continue pulsing every 600ms
                        const interval = setInterval(createPulse, 600);
                        edgeHoverIntervalsRef.current.push(interval);
                    }
                });
            })
            .on('mouseleave', function (event, d: GraphEdge) {
                // Clear all hover intervals
                edgeHoverIntervalsRef.current.forEach(interval => clearInterval(interval));
                edgeHoverIntervalsRef.current = [];

                // Remove all hover pulse rings
                g.selectAll('.edge-hover-pulse').remove();

                // Restore edge
                select(this)
                    .attr('stroke-opacity', 0.85)
                    .attr('stroke-width', getEdgeWidth(d));

                // Restore all visible node sizes
                g.selectAll('g.node circle')
                    .transition()
                    .duration(200)
                    .attr('r', 25);
            })
            .on('click', function (event, d: GraphEdge) {
                event.stopPropagation();

                // Get connected nodes
                const sourceId = typeof d.source === 'number' ? d.source : d.source.id;
                const targetId = typeof d.target === 'number' ? d.target : d.target.id;

                // Find all real nodes connected (handling junction nodes) - same logic as hover
                const connectedNodeIds: number[] = [];

                // Check source
                const sourceNode = nodes.find(n => n.id === sourceId);
                if (sourceNode?.isJunction) {
                    // Find all real nodes connected to this junction
                    edges.forEach(edge => {
                        const edgeSourceId = typeof edge.source === 'number' ? edge.source : edge.source.id;
                        const edgeTargetId = typeof edge.target === 'number' ? edge.target : edge.target.id;

                        if (edgeSourceId === sourceId) {
                            const targetNode = nodes.find(n => n.id === edgeTargetId);
                            if (targetNode && !targetNode.isJunction) connectedNodeIds.push(edgeTargetId);
                        }
                        if (edgeTargetId === sourceId) {
                            const sourceNode = nodes.find(n => n.id === edgeSourceId);
                            if (sourceNode && !sourceNode.isJunction) connectedNodeIds.push(edgeSourceId);
                        }
                    });
                } else {
                    connectedNodeIds.push(sourceId);
                }

                // Check target
                const targetNode = nodes.find(n => n.id === targetId);
                if (targetNode?.isJunction) {
                    // Find all real nodes connected to this junction
                    edges.forEach(edge => {
                        const edgeSourceId = typeof edge.source === 'number' ? edge.source : edge.source.id;
                        const edgeTargetId = typeof edge.target === 'number' ? edge.target : edge.target.id;

                        if (edgeSourceId === targetId) {
                            const targetNode = nodes.find(n => n.id === edgeTargetId);
                            if (targetNode && !targetNode.isJunction) connectedNodeIds.push(edgeTargetId);
                        }
                        if (edgeTargetId === targetId) {
                            const sourceNode = nodes.find(n => n.id === edgeSourceId);
                            if (sourceNode && !sourceNode.isJunction) connectedNodeIds.push(edgeSourceId);
                        }
                    });
                } else {
                    connectedNodeIds.push(targetId);
                }

                // Create continuous pulsing on all connected nodes for 3 seconds
                connectedNodeIds.forEach(nodeId => {
                    const nodeGroup = g.select(`g.node[data-id="${nodeId}"]`);
                    if (!nodeGroup.empty()) {
                        let pulseCount = 0;
                        const maxPulses = 5; // 3 seconds

                        const createPulse = () => {
                            if (pulseCount >= maxPulses) return;

                            const ring = nodeGroup.insert('circle', ':first-child')
                                .attr('class', 'edge-click-pulse')
                                .attr('r', 25)
                                .attr('fill', 'none')
                                .attr('stroke', '#f59e0b')
                                .attr('stroke-width', 3)
                                .attr('opacity', 0.8);

                            ring.transition()
                                .duration(1000)
                                .ease(easeQuadOut)
                                .attr('r', 50)
                                .attr('stroke-width', 1)
                                .attr('opacity', 0)
                                .remove();

                            pulseCount++;
                        };

                        // Create pulses
                        createPulse();
                        const interval = setInterval(() => {
                            createPulse();
                            if (pulseCount >= maxPulses) {
                                clearInterval(interval);
                            }
                        }, 600);
                    }
                });
            });

        // Draw nodes (excluding invisible junction nodes)
        const visibleNodes = nodes.filter(n => !n.isJunction);
        const node = g.append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(visibleNodes)
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('data-id', d => d.id) // Add data-id for focusOnNode
            .style('cursor', 'pointer')
            .call(drag<SVGGElement, GraphNode>()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended)
            );

        // Node circles
        node.append('circle')
            .attr('r', 25)
            .attr('fill', d => d.gender === 'female' ? '#fce7f3' : '#dbeafe')
            .attr('stroke', d => d.gender === 'female' ? '#f59e0b' : '#6366f1')
            .attr('stroke-width', 3);

        // Node initials
        node.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .attr('fill', d => d.gender === 'female' ? '#be185d' : '#1d4ed8')
            .attr('pointer-events', 'none')
            .text(d => {
                const parts = d.name.split(' ');
                return parts.map(p => p[0] || '').join('').substring(0, 2);
            });

        // Node labels (name below) - with background for better readability
        const maxLabelLen = width < 500 ? 12 : 16;
        const truncName = (name: string) => name.length > maxLabelLen ? name.substring(0, maxLabelLen - 2) + '…' : name;
        const charWidth = 6.5; // Approx px per character for 10px Hebrew font

        node.append('rect')
            .attr('x', d => {
                const text = truncName(d.name);
                return -(text.length * charWidth / 2 + 4);
            })
            .attr('y', 30)
            .attr('width', d => {
                const text = truncName(d.name);
                return text.length * charWidth + 8;
            })
            .attr('height', 18)
            .attr('rx', 4)
            .attr('fill', 'rgba(15, 23, 42, 0.92)')
            .attr('stroke', 'rgba(148, 163, 184, 0.2)')
            .attr('stroke-width', 0.5)
            .attr('pointer-events', 'none');

        node.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '43px')
            .attr('font-size', '10px')
            .attr('font-weight', '500')
            .attr('fill', '#e2e8f0')
            .attr('pointer-events', 'none')
            .text(d => truncName(d.name));

        // Click handler - support connection mode
        node.on('click', (event, d) => {
            event.stopPropagation();
            stopPulsing(); // Stop pulsing on node click

            // If in connecting mode, handle node selection for connection
            if (connectionMode === 'connecting') {
                if (!firstSelectedNode) {
                    setFirstSelectedNode(d);

                    // Create pulsing animation to show selection - use reliable selector
                    const nodeGroup = g.select(`g.node[data-id="${d.id}"]`);
                    if (!nodeGroup.empty()) {
                        const createSelectionPulse = () => {
                            const ring = nodeGroup.insert('circle', ':first-child')
                                .attr('class', 'selection-pulse')
                                .attr('r', 25)
                                .attr('fill', 'none')
                                .attr('stroke', '#fbbf24') // Amber for first
                                .attr('stroke-width', 4)
                                .attr('opacity', 1.0);

                            ring.transition()
                                .duration(800)
                                .ease(easeQuadOut)
                                .attr('r', 55)
                                .attr('stroke-width', 1)
                                .attr('opacity', 0)
                                .remove();
                        };

                        // Create 3 pulses for visual feedback
                        createSelectionPulse();
                        setTimeout(createSelectionPulse, 300);
                        setTimeout(createSelectionPulse, 600);
                    }
                } else if (firstSelectedNode.id !== d.id) {
                    setSecondSelectedNode(d);
                    setConnectionMode('selecting-type');

                    // Create pulsing animation for second selection - use reliable selector
                    const nodeGroup = g.select(`g.node[data-id="${d.id}"]`);
                    if (!nodeGroup.empty()) {
                        const createSelectionPulse = () => {
                            const ring = nodeGroup.insert('circle', ':first-child')
                                .attr('class', 'selection-pulse')
                                .attr('r', 25)
                                .attr('fill', 'none')
                                .attr('stroke', '#10b981') // Green for second
                                .attr('stroke-width', 4)
                                .attr('opacity', 1.0);

                            ring.transition()
                                .duration(800)
                                .ease(easeQuadOut)
                                .attr('r', 55)
                                .attr('stroke-width', 1)
                                .attr('opacity', 0)
                                .remove();
                        };

                        // Create 3 pulses for visual feedback
                        createSelectionPulse();
                        setTimeout(createSelectionPulse, 300);
                        setTimeout(createSelectionPulse, 600);
                    }
                }
                return;
            }

            // Normal click - open edit modal
            const member = allMembers.find(m => m.id === d.id);
            if (member) {
                setSelectedMember(member);
                setIsEditModalOpen(true);
            }
        });

        // Hover effects with tooltip
        node.on('mouseenter', function (event, d: GraphNode) {
            // Enlarge circle
            select(this).select('circle')
                .transition()
                .duration(200)
                .attr('r', 30);

            // Show tooltip using screen coordinates (fixed positioning)
            const member = allMembers.find(m => m.id === d.id);
            if (member && svgRef.current) {
                const svgEl = svgRef.current;
                const t = zoomTransform(svgEl);
                const svgRect = svgEl.getBoundingClientRect();
                // Node coords in SVG space → screen space
                const screenX = svgRect.left + t.applyX(d.x ?? 0);
                const circleTop = svgRect.top + t.applyY(d.y ?? 0) - 30;
                const circleBottom = svgRect.top + t.applyY(d.y ?? 0) + 30;
                // If not enough room above (~220px for tooltip), flip below
                const flipped = circleTop < 220;
                setTooltip({
                    visible: true,
                    x: screenX,
                    y: flipped ? circleBottom : circleTop,
                    flipped,
                    member: member
                });
            }

            // Find and pulse first-degree relatives
            const firstDegreeRelatives: number[] = [];

            edges.forEach(edge => {
                const edgeSourceId = typeof edge.source === 'number' ? edge.source : edge.source.id;
                const edgeTargetId = typeof edge.target === 'number' ? edge.target : edge.target.id;

                // If this node is the source, add target (if not junction)
                if (edgeSourceId === d.id) {
                    const targetNode = nodes.find(n => n.id === edgeTargetId);
                    if (targetNode && !targetNode.isJunction) {
                        firstDegreeRelatives.push(edgeTargetId);
                    } else if (targetNode?.isJunction) {
                        // If target is junction, find all real nodes connected through it
                        edges.forEach(e2 => {
                            const e2SourceId = typeof e2.source === 'number' ? e2.source : e2.source.id;
                            const e2TargetId = typeof e2.target === 'number' ? e2.target : e2.target.id;

                            if (e2SourceId === edgeTargetId && e2TargetId !== d.id) {
                                const realNode = nodes.find(n => n.id === e2TargetId);
                                if (realNode && !realNode.isJunction) firstDegreeRelatives.push(e2TargetId);
                            }
                            if (e2TargetId === edgeTargetId && e2SourceId !== d.id) {
                                const realNode = nodes.find(n => n.id === e2SourceId);
                                if (realNode && !realNode.isJunction) firstDegreeRelatives.push(e2SourceId);
                            }
                        });
                    }
                }

                // If this node is the target, add source (if not junction)
                if (edgeTargetId === d.id) {
                    const sourceNode = nodes.find(n => n.id === edgeSourceId);
                    if (sourceNode && !sourceNode.isJunction) {
                        firstDegreeRelatives.push(edgeSourceId);
                    } else if (sourceNode?.isJunction) {
                        // If source is junction, find all real nodes connected through it
                        edges.forEach(e2 => {
                            const e2SourceId = typeof e2.source === 'number' ? e2.source : e2.source.id;
                            const e2TargetId = typeof e2.target === 'number' ? e2.target : e2.target.id;

                            if (e2SourceId === edgeSourceId && e2TargetId !== d.id) {
                                const realNode = nodes.find(n => n.id === e2TargetId);
                                if (realNode && !realNode.isJunction) firstDegreeRelatives.push(e2TargetId);
                            }
                            if (e2TargetId === edgeSourceId && e2SourceId !== d.id) {
                                const realNode = nodes.find(n => n.id === e2SourceId);
                                if (realNode && !realNode.isJunction) firstDegreeRelatives.push(e2SourceId);
                            }
                        });
                    }
                }
            });

            // Remove duplicates
            const uniqueRelatives = Array.from(new Set(firstDegreeRelatives));

            // Pulse first-degree relatives
            uniqueRelatives.forEach(relativeId => {
                const nodeGroup = g.select(`g.node[data-id="${relativeId}"]`);
                if (!nodeGroup.empty()) {
                    const circle = nodeGroup.select('circle');

                    // Enlarge the relative node slightly
                    circle.transition()
                        .duration(200)
                        .attr('r', 28);

                    // Create continuous pulsing
                    const createPulse = () => {
                        const ring = nodeGroup.insert('circle', ':first-child')
                            .attr('class', 'node-hover-pulse')
                            .attr('r', 25)
                            .attr('fill', 'none')
                            .attr('stroke', '#10b981') // Green for relatives
                            .attr('stroke-width', 2)
                            .attr('opacity', 0.6);

                        ring.transition()
                            .duration(1000)
                            .ease(easeQuadOut)
                            .attr('r', 45)
                            .attr('stroke-width', 1)
                            .attr('opacity', 0)
                            .remove();
                    };

                    // Start immediate pulse
                    createPulse();

                    // Continue pulsing every 600ms
                    const interval = setInterval(createPulse, 600);
                    nodeHoverIntervalsRef.current.push(interval);
                }
            });
        });

        node.on('mouseleave', function () {
            // Clear all node hover intervals
            nodeHoverIntervalsRef.current.forEach(interval => clearInterval(interval));
            nodeHoverIntervalsRef.current = [];

            // Remove all node hover pulse rings
            g.selectAll('.node-hover-pulse').remove();

            // Restore all node circle sizes
            g.selectAll('g.node circle')
                .transition()
                .duration(200)
                .attr('r', 25);

            // Hide tooltip
            setTooltip(prev => ({ ...prev, visible: false }));
        });

        // Build node lookup for edge drawing (since we don't use forceLink)
        const nodeById = new Map<number, GraphNode>();
        nodes.forEach(n => nodeById.set(n.id, n));

        // Update positions function
        const updatePositions = () => {
            link.attr('d', d => {
                const sourceId = typeof d.source === 'number' ? d.source : (d.source as GraphNode).id;
                const targetId = typeof d.target === 'number' ? d.target : (d.target as GraphNode).id;
                const source = nodeById.get(sourceId);
                const target = nodeById.get(targetId);
                if (!source || !target) return '';
                const sx = source.x || 0;
                const sy = source.y || 0;
                const tx = target.x || 0;
                const ty = target.y || 0;

                // Smooth curved lines for better aesthetics and fewer visual crossings
                const dx = tx - sx;
                const dy = ty - sy;

                if (d.type === 'spouse') {
                    // Horizontal curve for spouses (they're usually close in Y)
                    const curvature = 0.3;
                    const cx1 = sx + dx * curvature;
                    const cy1 = sy - Math.abs(dx) * 0.2; // Curve upward
                    const cx2 = sx + dx * (1 - curvature);
                    const cy2 = ty - Math.abs(dx) * 0.2;
                    return `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`;
                } else if (d.type === 'parent-child') {
                    // Smooth S-curve for parent-child (vertical relationships)
                    const curvature = 0.6;
                    const cx1 = sx;
                    const cy1 = sy + dy * curvature;
                    const cx2 = tx;
                    const cy2 = sy + dy * curvature;
                    return `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`;
                } else {
                    // Gentle curve for siblings
                    const curvature = 0.4;
                    const cx1 = sx + dx * curvature;
                    const cy1 = sy + dy * curvature;
                    const cx2 = sx + dx * (1 - curvature);
                    const cy2 = sy + dy * (1 - curvature);
                    return `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`;
                }
            });

            node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
        };

        // Setup simulation tick
        simulation.on('tick', updatePositions);

        // Drag functions
        function dragstarted(event: D3DragEvent<SVGGElement, GraphNode, unknown>, d: GraphNode) {
            stopPulsing();
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event: D3DragEvent<SVGGElement, GraphNode, unknown>, d: GraphNode) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event: D3DragEvent<SVGGElement, GraphNode, unknown>, d: GraphNode) {
            if (!event.active) simulation.alphaTarget(0);
            // Snap back to computed position
            d.fx = null;
            d.fy = null;
            simulation.alpha(0.3).restart();
        }

        // Initial zoom to fit all nodes
        setTimeout(() => {
            handleFitView();
        }, 300);

        return () => {
            simulation.stop();
        };
    }, [loading, nodes, edges, allMembers, connectionMode, firstSelectedNode, layoutParams]);

    // Connection mode handlers
    const startConnectionMode = () => {
        setConnectionMode('connecting');
        setFirstSelectedNode(null);
        setSecondSelectedNode(null);
    };

    const cancelConnection = () => {
        setConnectionMode('none');
        setFirstSelectedNode(null);
        setSecondSelectedNode(null);
        // Refresh graph to clear highlights
        loadData();
    };

    const createConnection = async (relationType: RelationshipType) => {
        if (!firstSelectedNode || !secondSelectedNode) return;

        try {
            if (relationType === 'parent-child') {
                await familyService.addParentChild({
                    parent_id: firstSelectedNode.id,
                    child_id: secondSelectedNode.id,
                    relationship_type: 'biological'
                });
            } else if (relationType === 'spouse') {
                await familyService.addPartnership({
                    person1_id: firstSelectedNode.id,
                    person2_id: secondSelectedNode.id,
                    status: 'married'
                });
            } else if (relationType === 'sibling') {
                // Siblings are calculated automatically based on shared parents
                // Guide user to add parent-child relationships instead
                alert('קשרי אחים נוצרים אוטומטית!\n\nכדי ליצור קשר אחים, הוסף את שני האנשים כילדים של אותם הורים.\nהמערכת תזהה אותם אוטומטית כאחים.');
                cancelConnection();
                return;
            }

            // Refresh data
            await loadData();
            cancelConnection();
        } catch (error) {
            console.error('Failed to create connection:', error);
            alert(t('connectionError'));
        }
    };

    // Zoom controls
    const handleZoomIn = () => {
        if (svgRef.current && zoomRef.current) {
            select(svgRef.current).transition().call(zoomRef.current.scaleBy, 1.3);
        }
    };

    const handleZoomOut = () => {
        if (svgRef.current && zoomRef.current) {
            select(svgRef.current).transition().call(zoomRef.current.scaleBy, 0.7);
        }
    };

    const handleFitView = () => {
        // Fit all nodes into view
        if (!svgRef.current || !zoomRef.current || !containerRef.current) return;
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        if (nodes.length === 0) {
            select(svgRef.current).transition().call(
                zoomRef.current.transform,
                zoomIdentity.translate(width / 2, height / 2).scale(0.6)
            );
            return;
        }
        // Calculate bounding box of all nodes
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        nodes.forEach(n => {
            if (n.x != null && n.y != null) {
                minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
                minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y);
            }
        });
        const dx = maxX - minX + 100;
        const dy = maxY - minY + 100;
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const scale = Math.min(0.9, 0.85 / Math.max(dx / width, dy / height));
        select(svgRef.current).transition().duration(500).call(
            zoomRef.current.transform,
            zoomIdentity.translate(width / 2 - cx * scale, height / 2 - cy * scale).scale(scale)
        );
    };

    // Focus on a specific node with zoom and highlight
    const focusOnNode = (nodeId: number) => {
        if (!svgRef.current || !zoomRef.current || !containerRef.current) return;

        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        // Wait a bit if positions aren't ready yet (simulation just started)
        if (!node.x || !node.y) {
            setTimeout(() => focusOnNode(nodeId), 100);
            return;
        }

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        // Calculate transform to center the node
        const scale = 1.5;
        const x = width / 2 - scale * node.x;
        const y = height / 2 - scale * node.y;

        // Zoom to node
        select(svgRef.current)
            .transition()
            .duration(750)
            .call(
                zoomRef.current.transform,
                zoomIdentity.translate(x, y).scale(scale)
            )
            .on('end', () => {
                // Start pulsing after zoom completes
                startNodePulsing(nodeId);
            });

        // Hide tooltip during focus
        setTooltip(prev => ({ ...prev, visible: false }));
    };

    // Helper function to start pulsing on a node
    const startNodePulsing = (nodeId: number) => {
        if (!svgRef.current) return;

        // Highlight the node with pulsing animation
        const svg = select(svgRef.current);
        const graphContainer = svg.select('g.graph-container');
        const nodeGroup = graphContainer.select(`g.node[data-id="${nodeId}"]`);

        // Clear any existing pulsing animation
        if (pulsingIntervalRef.current) {
            clearInterval(pulsingIntervalRef.current);
            pulsingIntervalRef.current = null;
        }

        // Remove any existing pulse rings
        graphContainer.selectAll('.pulse-ring').remove();

        if (!nodeGroup.empty()) {
            const circle = nodeGroup.select('circle');
            const radius = 25;

            // 1. Initial gentle flash
            circle
                .transition()
                .duration(400)
                .ease(easeCubicInOut)
                .attr('r', 32)
                .transition()
                .duration(400)
                .ease(easeCubicInOut)
                .attr('r', 25);

            // 2. Create continuous pulsing effect for 5 seconds
            let pulseCount = 0;
            const maxPulses = 8; // ~5 seconds (8 pulses × 600ms)

            const createPulseRing = () => {
                if (pulseCount >= maxPulses) {
                    if (pulsingIntervalRef.current) {
                        clearInterval(pulsingIntervalRef.current);
                        pulsingIntervalRef.current = null;
                    }
                    return;
                }

                const ring = nodeGroup.insert('circle', ':first-child')
                    .attr('class', 'pulse-ring')
                    .attr('r', radius)
                    .attr('fill', 'none')
                    .attr('stroke', '#f59e0b')
                    .attr('stroke-width', 3)
                    .attr('opacity', 0.8);

                ring.transition()
                    .duration(1200)
                    .ease(easeQuadOut)
                    .attr('r', radius + 25)
                    .attr('stroke-width', 1)
                    .attr('opacity', 0)
                    .remove();

                pulseCount++;
            };

            // Start pulsing immediately and then every 600ms
            createPulseRing();
            pulsingIntervalRef.current = setInterval(createPulseRing, 600);
        } else {
            console.warn('[CommunityGraph] Node group not found for pulsing:', nodeId);
        }
    };

    // Stop pulsing on any interaction
    const stopPulsing = () => {
        if (pulsingIntervalRef.current) {
            clearInterval(pulsingIntervalRef.current);
            pulsingIntervalRef.current = null;
        }
        // Remove all pulse rings
        if (svgRef.current) {
            select(svgRef.current).selectAll('.pulse-ring').remove();
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="relative w-full h-[calc(100vh-180px)] flex flex-col bg-[#0d1424] overflow-hidden">
            <SEOHead
                title={t('pageTitle')}
                description={t('pageDescription')}
                canonicalPath="/family"
            />
            {/* Header */}
            <div className="bg-slate-800/80 backdrop-blur px-3 py-2 md:px-4 md:py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 relative z-[100]">
                <div className="flex items-center gap-2 md:gap-3">
                    <h1 className="text-base md:text-xl font-bold text-white whitespace-nowrap">{t('communityNetwork')}</h1>
                    <span className="text-xs md:text-sm text-slate-400 whitespace-nowrap">
                        {nodes.length} {t('members')} • {edges.length} {t('connections')}
                    </span>
                </div>

                <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                    {/* Search Bar - with fixed z-index */}
                    <div className="relative z-[9999]">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        <input
                            type="text"
                            placeholder={t('searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => {
                                const query = e.target.value;
                                setSearchQuery(query);
                                if (query.length >= 2) {
                                    const q = query.toLowerCase();
                                    const results = nodes.filter(n =>
                                        n.name.toLowerCase().includes(q) ||
                                        (n.nameRu && n.nameRu.toLowerCase().includes(q)) ||
                                        (n.maidenName && n.maidenName.toLowerCase().includes(q)) ||
                                        (n.previousName && n.previousName.toLowerCase().includes(q)) ||
                                        (n.maidenName && `${n.name.split(' ')[0]} ${n.maidenName}`.toLowerCase().includes(q))
                                    ).slice(0, 10);
                                    setSearchResults(results);
                                } else {
                                    setSearchResults([]);
                                }
                            }}
                            className="ps-9 pe-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus-visible:border-amber-500 w-36 md:w-48 relative z-10"
                        />
                        {searchResults.length > 0 && (
                            <div className="absolute top-full mt-1 right-0 w-72 md:w-80 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl max-h-80 overflow-y-auto">
                                {searchResults.map(result => (
                                    <button
                                        key={result.id}
                                        onClick={() => {
                                            focusOnNode(result.id);
                                            setSearchQuery('');
                                            setSearchResults([]);
                                        }}
                                        className="w-full text-start px-4 py-2.5 hover:bg-slate-700 transition-colors text-sm border-b border-slate-700 last:border-b-0"
                                    >
                                        <div className="font-medium text-white">
                                            {result.name}
                                            {result.maidenName && <span className="text-slate-400 text-xs font-normal"> ({result.maidenName})</span>}
                                        </div>
                                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400">
                                            {result.birthYear && (
                                                <span>📅 {result.birthYear}{result.currentResidence ? `, ${result.currentResidence}` : result.birthPlace ? `, ${result.birthPlace}` : ''}</span>
                                            )}
                                            {!result.birthYear && (result.currentResidence || result.birthPlace) && (
                                                <span>📍 {result.currentResidence || result.birthPlace}</span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="hidden md:block w-px h-6 bg-slate-600" />

                    {/* Add Person Button */}
                    <button
                        onClick={() => {
                            setSelectedMember(null);
                            setIsEditModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white text-xs md:text-sm font-medium transition-colors"
                    >
                        <UserPlus size={14} />
                        <span className="sm:hidden">{t('addShort')}</span>
                        <span className="hidden sm:inline">{t('addPerson')}</span>
                    </button>

                    {/* Connection Mode Button */}
                    {connectionMode === 'none' ? (
                        <button
                            onClick={startConnectionMode}
                            className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 bg-amber-600 hover:bg-amber-700 rounded-lg text-white text-xs md:text-sm font-medium transition-colors"
                        >
                            <Link2 size={14} />
                            <span className="sm:hidden">{t('connectShort')}</span>
                            <span className="hidden sm:inline">{t('connectPeople')}</span>
                        </button>
                    ) : (
                        <button
                            onClick={cancelConnection}
                            className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-white text-xs md:text-sm font-medium transition-colors"
                        >
                            <X size={14} />
                            <span className="hidden sm:inline">{tc('cancel')}</span>
                        </button>
                    )}

                    {/* Legend - as popup button */}
                    <div className="relative">
                        <button
                            onClick={() => setShowLegend(!showLegend)}
                            className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-xs md:text-sm transition-colors"
                        >
                            <Info size={14} />
                            <span className="sm:hidden">{t('legendShort')}</span>
                            <span className="hidden sm:inline">{t('legend')}</span>
                        </button>

                        {showLegend && (
                            <>
                                {/* Backdrop to close */}
                                <div
                                    className="fixed inset-0 z-[9998]"
                                    onClick={() => setShowLegend(false)}
                                />

                                {/* Legend popup */}
                                <div className="absolute left-0 top-full mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl p-4 z-[9999] w-64 md:w-80">
                                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                        <Info size={14} />
                                        {t('legendTitle')}
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2 pb-2 border-b border-slate-700">
                                            <div className="w-4 h-4 rounded-full bg-indigo-500 border-2 border-indigo-600" />
                                            <span className="text-slate-300">{t('male')}</span>
                                            <div className="w-4 h-4 rounded-full bg-amber-500 border-2 border-amber-600 ms-auto" />
                                            <span className="text-slate-300">{t('female')}</span>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <svg width="32" height="12" className="flex-shrink-0">
                                                    <line x1="0" y1="6" x2="32" y2="6" stroke="#38bdf8" strokeWidth="2.5" />
                                                </svg>
                                                <span className="text-slate-300">{t('parentChild')}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <svg width="32" height="12" className="flex-shrink-0">
                                                    <line x1="0" y1="6" x2="32" y2="6" stroke="#f472b6" strokeWidth="3" />
                                                </svg>
                                                <span className="text-slate-300">{t('married')}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <svg width="32" height="12" className="flex-shrink-0">
                                                    <line x1="0" y1="6" x2="32" y2="6" stroke="#f87171" strokeWidth="3" strokeDasharray="5,5" />
                                                </svg>
                                                <span className="text-slate-300">{t('divorced')}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <svg width="32" height="12" className="flex-shrink-0">
                                                    <line x1="0" y1="6" x2="32" y2="6" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="2,4" />
                                                </svg>
                                                <span className="text-slate-300">{t('widowed')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Connection Status Banner */}
            {connectionMode === 'connecting' && (
                <div className="bg-amber-600 text-white px-4 py-2 text-center text-sm">
                    {firstSelectedNode
                        ? t('selectedPerson', { name: firstSelectedNode.name })
                        : t('selectFirstPerson')}
                </div>
            )}

            {/* Graph Container */}
            <div ref={containerRef} className="flex-1 relative overflow-hidden z-0" style={{ minHeight: '500px' }}>
                <svg
                    ref={svgRef}
                    width="100%"
                    height="100%"
                    style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', display: 'block', touchAction: 'none' }}
                />

                {/* Layout Debug Panel */}
                {showControls && (
                    <div className="absolute top-2 left-2 bg-slate-900/95 border border-slate-600 rounded-xl p-3 z-50 w-64 max-h-[80vh] overflow-y-auto text-xs" dir="ltr" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-white text-sm">Layout Params</h3>
                            <button onClick={() => setShowControls(false)} className="text-slate-400 hover:text-white"><X size={14} /></button>
                        </div>
                        {([
                            { key: 'nodeSpacing', label: 'Node Spacing', min: 60, max: 250, step: 5 },
                            { key: 'coupleGap', label: 'Couple Gap', min: 30, max: 150, step: 5 },
                            { key: 'familyGap', label: 'Family Gap', min: 50, max: 500, step: 10 },
                            { key: 'yearPx', label: 'Year px', min: 4, max: 30, step: 1 },
                            { key: 'minGap', label: 'Min Gap (overlap)', min: 50, max: 200, step: 5 },
                            { key: 'collisionRadius', label: 'Collision Radius', min: 20, max: 80, step: 2 },
                            { key: 'snapBack', label: 'Snap-back', min: 0.05, max: 0.8, step: 0.05 },
                            { key: 'overlapRounds', label: 'Overlap Rounds', min: 0, max: 10, step: 1 },
                        ] as const).map(({ key, label, min, max, step }) => (
                            <div key={key} className="mb-2">
                                <div className="flex justify-between text-slate-300">
                                    <span>{label}</span>
                                    <span className="text-indigo-400 font-mono">{layoutParams[key]}</span>
                                </div>
                                <input
                                    type="range" min={min} max={max} step={step}
                                    value={layoutParams[key]}
                                    onChange={e => setLayoutParams(p => ({ ...p, [key]: parseFloat(e.target.value) }))}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                            </div>
                        ))}
                        <button
                            onClick={() => setLayoutParams({ nodeSpacing: 80, coupleGap: 55, familyGap: 120, yearPx: 10, minGap: 90, collisionRadius: 40, snapBack: 0.3, overlapRounds: 3 })}
                            className="w-full mt-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs"
                        >Reset defaults</button>
                    </div>
                )}

                {/* Connection Type Selection Modal */}
                {connectionMode === 'selecting-type' && firstSelectedNode && secondSelectedNode && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-50" onClick={cancelConnection}>
                        <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-slate-700" onClick={e => e.stopPropagation()}>
                            <h3 className="text-xl font-bold text-white mb-4 text-center">{t('chooseRelationType')}</h3>
                            <p className="text-sm text-slate-300 mb-6 text-center">
                                {t('betweenPersons', { person1: firstSelectedNode.name, person2: secondSelectedNode.name })}
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => createConnection('parent-child')}
                                    className="w-full flex items-center gap-3 p-4 bg-sky-600 hover:bg-sky-700 rounded-lg text-white transition-colors"
                                >
                                    <div className="w-10 h-1 bg-sky-400" />
                                    <div className="flex-1 text-start">
                                        <div className="font-bold">{t('parentChild')}</div>
                                        <div className="text-xs text-sky-200">{t('parentChildDesc', { parent: firstSelectedNode.name, child: secondSelectedNode.name })}</div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => createConnection('spouse')}
                                    className="w-full flex items-center gap-3 p-4 bg-amber-600 hover:bg-amber-700 rounded-lg text-white transition-colors"
                                >
                                    <div className="w-10 h-1 bg-amber-400" />
                                    <div className="flex-1 text-start">
                                        <div className="font-bold">{t('spouseMarried')}</div>
                                        <div className="text-xs text-amber-200">{t('spouseDesc', { person1: firstSelectedNode.name, person2: secondSelectedNode.name })}</div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => createConnection('sibling')}
                                    className="w-full flex items-center gap-3 p-4 bg-teal-600 hover:bg-teal-700 rounded-lg text-white transition-colors"
                                >
                                    <div className="w-10 h-1 bg-teal-400 border-dashed" />
                                    <div className="flex-1 text-start">
                                        <div className="font-bold">{t('siblings')}</div>
                                        <div className="text-xs text-teal-200">{t('siblingsDesc', { person1: firstSelectedNode.name, person2: secondSelectedNode.name })}</div>
                                    </div>
                                </button>
                            </div>

                            <button
                                onClick={cancelConnection}
                                className="w-full mt-4 px-4 py-2 text-slate-400 hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                {tc('cancel')}
                            </button>
                        </div>
                    </div>
                )}

                {/* Zoom Controls */}
                <div className="absolute top-3 right-3 flex gap-2">
                    <button
                        onClick={handleZoomIn}
                        className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
                        title={t('zoomIn')}
                    >
                        <ZoomIn size={20} />
                    </button>
                    <button
                        onClick={handleZoomOut}
                        className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
                        title={t('zoomOut')}
                    >
                        <ZoomOut size={20} />
                    </button>
                    <button
                        onClick={handleFitView}
                        className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
                        title={t('fitView')}
                    >
                        <Maximize2 size={20} />
                    </button>
                    {/* Layout debug toggle */}
                    {isAdmin && (
                        <button
                            type="button"
                            onClick={() => setShowControls(v => !v)}
                            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
                            title="Layout params"
                        >
                            <Sliders size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Tooltip */}
            {tooltip.visible && tooltip.member && (
                <div
                    className="fixed z-[200] pointer-events-none"
                    style={{
                        left: `${tooltip.x}px`,
                        top: `${tooltip.y}px`,
                        transform: tooltip.flipped ? 'translate(-50%, 0%)' : 'translate(-50%, -100%)'
                    }}
                >
                    <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-lg shadow-2xl p-3 min-w-[220px] max-w-[300px]" dir="rtl">
                        {/* Header with photo */}
                        <div className="flex items-center gap-2.5 mb-2 pb-2 border-b border-slate-700">
                            {tooltip.member.photo_url ? (
                                <img
                                    src={tooltip.member.photo_url}
                                    alt={tooltip.member.first_name}
                                    className="w-12 h-12 rounded-full object-cover border border-slate-500"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center border border-slate-500">
                                    <User size={24} className="text-slate-400" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-white text-base leading-tight">
                                    {tooltip.member.title && `${tooltip.member.title} `}
                                    {tooltip.member.first_name} {tooltip.member.last_name}
                                </h3>
                                {tooltip.member.maiden_name && (
                                    <p className="text-xs text-slate-400">({tooltip.member.maiden_name})</p>
                                )}
                                {tooltip.member.nickname && (
                                    <p className="text-xs text-slate-500">"{tooltip.member.nickname}"</p>
                                )}
                            </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-1.5 text-xs">
                            {/* Birth info */}
                            {(tooltip.member.birth_date || tooltip.member.birth_city) && (
                                <div className="flex items-center gap-1.5 text-slate-300">
                                    <span>📅</span>
                                    <span>{t('born')}: {tooltip.member.birth_date && new Date(tooltip.member.birth_date).toLocaleDateString('he-IL')}
                                    {tooltip.member.birth_city && `, ${tooltip.member.birth_city}`}</span>
                                </div>
                            )}

                            {/* Death info - only if has date or place */}
                            {!tooltip.member.is_alive && (tooltip.member.death_date || tooltip.member.death_city) && (
                                <div className="flex items-center gap-1.5 text-slate-400">
                                    <span>🕊️</span>
                                    <span>{t('died')}: {tooltip.member.death_date && new Date(tooltip.member.death_date).toLocaleDateString('he-IL')}
                                    {tooltip.member.death_city && `, ${tooltip.member.death_city}`}</span>
                                </div>
                            )}

                            {/* Residence or birth place */}
                            {(() => {
                                const residence = tooltip.member.residence_city || tooltip.member.current_residence;
                                const birthPlace = tooltip.member.birth_city;
                                const place = residence || birthPlace;
                                if (!place) return null;
                                return (
                                    <div className="flex items-center gap-1.5 text-slate-300">
                                        <span>📍</span>
                                        <span>{residence ? t('residence') : t('origin')}: {place}{tooltip.member.residence_country ? `, ${tooltip.member.residence_country}` : tooltip.member.birth_country ? `, ${tooltip.member.birth_country}` : ''}</span>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Hint */}
                        <div className="mt-2 pt-2 border-t border-slate-700 text-[10px] text-slate-500 text-center">
                            {t('clickToEdit')}
                        </div>
                    </div>

                    {/* Arrow */}
                    <div
                        className={`absolute left-1/2 w-0 h-0 border-e-8 border-s-8 border-transparent ${
                            tooltip.flipped
                                ? '-top-2 border-b-8 border-b-slate-600'
                                : '-bottom-2 border-t-8 border-t-slate-600'
                        }`}
                        style={{ transform: 'translateX(-50%)' }}
                    />
                </div>
            )}

            {/* Edit Modal */}
            <EditMemberModal
                isOpen={isEditModalOpen}
                member={selectedMember}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedMember(null);
                }}
                onSuccess={async (newMemberId?: number) => {
                    // If there's a pending relation and we just created a new member, link them
                    if (pendingRelation && newMemberId) {
                        try {
                            const { fromMemberId, type } = pendingRelation;
                            if (type === 'parent') {
                                await familyService.addParentChild({
                                    parent_id: newMemberId,
                                    child_id: fromMemberId,
                                    relationship_type: 'biological'
                                });
                            } else if (type === 'child') {
                                await familyService.addParentChild({
                                    parent_id: fromMemberId,
                                    child_id: newMemberId,
                                    relationship_type: 'biological'
                                });
                            } else if (type === 'spouse') {
                                await familyService.addPartnership({
                                    person1_id: fromMemberId,
                                    person2_id: newMemberId,
                                    status: 'married'
                                });
                            }
                        } catch (err) {
                            console.error('Failed to create relationship:', err);
                        }
                        setPendingRelation(null);
                    }
                    setIsEditModalOpen(false);
                    setSelectedMember(null);
                    loadData();
                }}
                onGraphRefresh={() => loadData()}
                onAddRelative={(type: 'parent' | 'child' | 'spouse') => {
                    // Save current member + relation type, then open fresh modal
                    if (selectedMember?.id) {
                        setPendingRelation({ fromMemberId: selectedMember.id, type });
                    }
                    setSelectedMember(null);
                    setTimeout(() => setIsEditModalOpen(true), 100);
                }}
                potentialRelations={allMembers}
            />
        </div>
    );
};

export default CommunityGraph;
