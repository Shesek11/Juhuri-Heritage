/**
 * CommunityGraph.tsx
 * D3.js Force-Directed Graph for Community Family Visualization
 * Shows all members as nodes with relationships as edges
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { familyService, FamilyMember } from '../../services/familyService';
import { EditMemberModal } from './EditMemberModal';
import { Loader2, ZoomIn, ZoomOut, Maximize2, UserPlus, Link2, X, Search, Network, Info, Eye, Sliders, User } from 'lucide-react';

interface GraphNode extends d3.SimulationNodeDatum {
    id: number;
    name: string;
    gender: 'male' | 'female' | 'other';
    birthYear?: number;
    birthPlace?: string;
    currentResidence?: string;
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
        spouseDistance: 70,
        collisionRadius: 20,
        yForceStrength: 1.00
    });

    // Edit modal state
    const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Connection mode state
    const [connectionMode, setConnectionMode] = useState<ConnectionMode>('none');
    const [firstSelectedNode, setFirstSelectedNode] = useState<GraphNode | null>(null);
    const [secondSelectedNode, setSecondSelectedNode] = useState<GraphNode | null>(null);

    // Tooltip state
    const [tooltip, setTooltip] = useState<{
        visible: boolean;
        x: number;
        y: number;
        member: FamilyMember | null;
    }>({ visible: false, x: 0, y: 0, member: null });

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<GraphNode[]>([]);

    // Zoom ref for controls
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

    // Pulsing animation control
    const pulsingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Simulation ref for real-time parameter updates
    const simulationRef = useRef<d3.Simulation<GraphNode, undefined> | null>(null);

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
                gender: m.gender || 'other',
                birthYear: m.birth_date ? new Date(m.birth_date).getFullYear() : undefined,
                birthPlace: m.birth_place,
                currentResidence: m.current_residence,
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

            // Assign generation to nodes
            graphNodes.forEach(n => {
                n.generation = generationMap.get(n.id) ?? 0;
            });

            console.log('[CommunityGraph] Loaded:', graphNodes.length, 'nodes,', graphEdges.length, 'edges');
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
        const linkForce = sim.force('link') as d3.ForceLink<GraphNode, GraphEdge>;
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
        sim.force('charge', d3.forceManyBody().strength(forceParams.charge));

        // Update y-force
        const yForce = sim.force('y') as d3.ForceY<GraphNode>;
        if (yForce) {
            yForce.strength(forceParams.yForceStrength);
        }

        // Update collision force
        sim.force('collision', d3.forceCollide().radius(forceParams.collisionRadius));

        // Restart simulation with new parameters (higher alpha for better convergence)
        sim.alpha(0.5).restart();
    }, [forceParams]);

    // Highlight selected nodes in connection mode
    useEffect(() => {
        if (!svgRef.current || (!firstSelectedNode && !secondSelectedNode)) {
            // Clear all highlights if no node is selected
            if (svgRef.current) {
                d3.select(svgRef.current)
                    .selectAll('g.node circle')
                    .attr('stroke-width', 3)
                    .attr('stroke', d => {
                        const nodeData = d as GraphNode;
                        return nodeData.gender === 'female' ? '#ec4899' : '#3b82f6';
                    });
            }
            return;
        }

        // Highlight the selected nodes
        const svg = d3.select(svgRef.current);
        const graphContainer = svg.select('g.graph-container');

        // Reset all nodes first
        graphContainer.selectAll('g.node circle')
            .attr('stroke-width', 3)
            .attr('stroke', d => {
                const nodeData = d as GraphNode;
                return nodeData.gender === 'female' ? '#ec4899' : '#3b82f6';
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

        const svg = d3.select(svgRef.current);
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

        // Setup zoom with error handling
        try {
            const zoom = d3.zoom<SVGSVGElement, unknown>()
                .scaleExtent([0.1, 4])
                .on('zoom', (event) => {
                    g.attr('transform', event.transform);
                    stopPulsing(); // Stop pulsing on zoom/pan
                });

            svg.call(zoom);
            zoomRef.current = zoom;
        } catch (error) {
            console.error('[CommunityGraph] Error initializing zoom:', error);
        }

        // Clear all fixed positions
        nodes.forEach(n => {
            n.fx = null;
            n.fy = null;
        });

            const years = nodes.map(n => n.birthYear).filter(y => y) as number[];
            const minYear = years.length > 0 ? Math.min(...years) : 1940;
            const maxYear = years.length > 0 ? Math.max(...years) : 2025;
            const yearSpan = Math.max(maxYear - minYear, 50);
            const padding = 80;
            const leftPadding = 60;

        const yearToY = (year: number) => {
            const normalized = (year - minYear) / yearSpan;
            return padding + normalized * (height - 2 * padding);
        };

        // Draw 25-year markers on the left side
        const startYear = Math.floor(minYear / 25) * 25;
        const endYear = Math.ceil(maxYear / 25) * 25;
        for (let year = startYear; year <= endYear; year += 25) {
            const yPos = yearToY(year);

            // Horizontal line across width
            g.append('line')
                .attr('x1', leftPadding)
                .attr('y1', yPos)
                .attr('x2', width)
                .attr('y2', yPos)
                .attr('stroke', 'rgba(255,255,255,0.1)')
                .attr('stroke-width', 1)
                .attr('pointer-events', 'none');

            // Year label - positioned better with background
            const labelGroup = g.append('g');

            labelGroup.append('rect')
                .attr('x', 5)
                .attr('y', yPos - 12)
                .attr('width', 45)
                .attr('height', 20)
                .attr('fill', 'rgba(15, 23, 42, 0.8)')
                .attr('rx', 4)
                .attr('pointer-events', 'none');

            labelGroup.append('text')
                .attr('x', 27)
                .attr('y', yPos + 4)
                .attr('font-size', '13px')
                .attr('font-weight', '600')
                .attr('fill', 'rgba(255,255,255,0.7)')
                .attr('text-anchor', 'middle')
                .attr('pointer-events', 'none')
                .text(year.toString());
        }

        // Initialize node positions for consistent layout (not random)
        nodes.forEach((n, i) => {
            if (!n.x || !n.y) {
                // Start nodes in a grid pattern based on their index
                const cols = Math.ceil(Math.sqrt(nodes.length));
                const row = Math.floor(i / cols);
                const col = i % cols;
                n.x = (col + 0.5) * (width / cols);
                n.y = (row + 0.5) * (height / Math.ceil(nodes.length / cols));
            }
        });

        // Create force simulation with birth-year based Y positioning
        const simulation = d3.forceSimulation<GraphNode>(nodes)
            .force('link', d3.forceLink<GraphNode, GraphEdge>(edges)
                .id(d => d.id)
                .distance(d => {
                    if (d.type === 'spouse') return forceParams.spouseDistance;
                    if (d.type === 'parent-child') return forceParams.parentChildDistance;
                    return 100;
                })
                .strength(d => {
                    if (d.type === 'spouse') return forceParams.spouseStrength;
                    if (d.type === 'parent-child') return forceParams.parentChildStrength;
                    return 0.5;
                })
            )
            .force('charge', d3.forceManyBody().strength(forceParams.charge))
            .force('x', d3.forceX(width / 2).strength(0.05))
            .force('y', d3.forceY<GraphNode>(d => yearToY(d.birthYear ?? ((minYear + maxYear) / 2))).strength(forceParams.yForceStrength))
            .force('collision', d3.forceCollide().radius(forceParams.collisionRadius))
            .alpha(1.0)  // Start with high energy for better initial layout
            .alphaDecay(0.008)  // Slower cooling = more time to settle
            .velocityDecay(0.4); // More friction = smoother convergence

        // Store simulation ref for real-time updates
        simulationRef.current = simulation;

        // Edge colors and styles - vibrant and clear
        const getEdgeColor = (d: GraphEdge) => {
            if (d.type === 'spouse') {
                if (d.status === 'divorced') return '#ef4444'; // Vibrant red for divorced
                if (d.status === 'widowed') return '#9ca3af'; // Gray for widowed
                return '#ec4899'; // Vibrant pink for married
            }
            if (d.type === 'parent-child') return '#3b82f6'; // Vibrant blue
            if (d.type === 'sibling') return '#a855f7'; // Vibrant purple
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
            .on('mouseenter', function(event, d: GraphEdge) {
                // Highlight the edge
                d3.select(this)
                    .attr('stroke-opacity', 1)
                    .attr('stroke-width', getEdgeWidth(d) + 1);

                // Get connected nodes
                const sourceId = typeof d.source === 'number' ? d.source : d.source.id;
                const targetId = typeof d.target === 'number' ? d.target : d.target.id;

                // Pulse both connected nodes (skip junction nodes)
                [sourceId, targetId].forEach(nodeId => {
                    const nodeData = nodes.find(n => n.id === nodeId);
                    if (!nodeData || nodeData.isJunction) return;

                    const nodeGroup = g.select(`g.node[data-id="${nodeId}"]`);
                    if (!nodeGroup.empty()) {
                        const circle = nodeGroup.select('circle');

                        // Create pulsing ring
                        const ring = nodeGroup.insert('circle', ':first-child')
                            .attr('class', 'edge-hover-pulse')
                            .attr('r', 25)
                            .attr('fill', 'none')
                            .attr('stroke', '#f59e0b')
                            .attr('stroke-width', 3)
                            .attr('opacity', 0.8);

                        ring.transition()
                            .duration(800)
                            .ease(d3.easeQuadOut)
                            .attr('r', 50)
                            .attr('stroke-width', 1)
                            .attr('opacity', 0)
                            .remove();

                        // Enlarge the node
                        circle.transition()
                            .duration(200)
                            .attr('r', 30);
                    }
                });
            })
            .on('mouseleave', function(event, d: GraphEdge) {
                // Restore edge
                d3.select(this)
                    .attr('stroke-opacity', 0.85)
                    .attr('stroke-width', getEdgeWidth(d));

                // Restore node sizes
                const sourceId = typeof d.source === 'number' ? d.source : d.source.id;
                const targetId = typeof d.target === 'number' ? d.target : d.target.id;

                [sourceId, targetId].forEach(nodeId => {
                    const nodeData = nodes.find(n => n.id === nodeId);
                    if (!nodeData || nodeData.isJunction) return;

                    const nodeGroup = g.select(`g.node[data-id="${nodeId}"]`);
                    if (!nodeGroup.empty()) {
                        nodeGroup.select('circle')
                            .transition()
                            .duration(200)
                            .attr('r', 25);
                    }
                });
            })
            .on('click', function(event, d: GraphEdge) {
                event.stopPropagation();

                // Get connected nodes
                const sourceId = typeof d.source === 'number' ? d.source : d.source.id;
                const targetId = typeof d.target === 'number' ? d.target : d.target.id;

                // Create continuous pulsing on both nodes for 3 seconds
                [sourceId, targetId].forEach(nodeId => {
                    const nodeData = nodes.find(n => n.id === nodeId);
                    if (!nodeData || nodeData.isJunction) return;

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
                                .ease(d3.easeQuadOut)
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
            .call(d3.drag<SVGGElement, GraphNode>()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended)
            );

        // Node circles
        node.append('circle')
            .attr('r', 25)
            .attr('fill', d => d.gender === 'female' ? '#fce7f3' : '#dbeafe')
            .attr('stroke', d => d.gender === 'female' ? '#ec4899' : '#3b82f6')
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
        node.append('rect')
            .attr('x', d => {
                const text = d.name.length > 18 ? d.name.substring(0, 15) + '...' : d.name;
                return -(text.length * 3.5); // Approximate width based on character count
            })
            .attr('y', 32)
            .attr('width', d => {
                const text = d.name.length > 18 ? d.name.substring(0, 15) + '...' : d.name;
                return text.length * 7; // Approximate width
            })
            .attr('height', 18)
            .attr('rx', 4)
            .attr('fill', 'rgba(30, 41, 59, 0.85)')
            .attr('stroke', 'rgba(148, 163, 184, 0.3)')
            .attr('stroke-width', 1)
            .attr('pointer-events', 'none');

        node.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '45px')
            .attr('font-size', '11px')
            .attr('fill', '#fff')
            .attr('pointer-events', 'none')
            .text(d => d.name.length > 18 ? d.name.substring(0, 15) + '...' : d.name);

        // Click handler - support connection mode
        node.on('click', (event, d) => {
            event.stopPropagation();
            stopPulsing(); // Stop pulsing on node click

            // If in connecting mode, handle node selection for connection
            if (connectionMode === 'connecting') {
                if (!firstSelectedNode) {
                    setFirstSelectedNode(d);
                    // Highlight selected node
                    d3.select(event.currentTarget).select('circle')
                        .attr('stroke-width', 5)
                        .attr('stroke', '#fbbf24'); // Amber highlight
                } else if (firstSelectedNode.id !== d.id) {
                    setSecondSelectedNode(d);
                    setConnectionMode('selecting-type');
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
            d3.select(this).select('circle')
                .transition()
                .duration(200)
                .attr('r', 30);

            // Show tooltip
            const member = allMembers.find(m => m.id === d.id);
            if (member) {
                const rect = (event.target as Element).getBoundingClientRect();
                const containerRect = containerRef.current?.getBoundingClientRect();

                if (containerRect) {
                    setTooltip({
                        visible: true,
                        x: rect.left - containerRect.left + rect.width / 2,
                        y: rect.top - containerRect.top - 10,
                        member: member
                    });
                }
            }
        });

        node.on('mouseleave', function () {
            // Restore circle size
            d3.select(this).select('circle')
                .transition()
                .duration(200)
                .attr('r', 25);

            // Hide tooltip
            setTooltip(prev => ({ ...prev, visible: false }));
        });

        // Update positions function
        const updatePositions = () => {
            link.attr('d', d => {
                const source = d.source as GraphNode;
                const target = d.target as GraphNode;
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
        function dragstarted(event: d3.D3DragEvent<SVGGElement, GraphNode, unknown>, d: GraphNode) {
            stopPulsing(); // Stop pulsing on drag
            if (!event.active) simulation.alphaTarget(0.5).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event: d3.D3DragEvent<SVGGElement, GraphNode, unknown>, d: GraphNode) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event: d3.D3DragEvent<SVGGElement, GraphNode, unknown>, d: GraphNode) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        // Initial zoom to fit - center on the graph
        setTimeout(() => {
            svg.transition().duration(750).call(
                zoom.transform,
                d3.zoomIdentity.translate(0, 0).scale(1)
            );
        }, 800);

        return () => {
            simulation.stop();
        };
    }, [loading, nodes, edges, allMembers, connectionMode, firstSelectedNode]);

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
            alert('שגיאה ביצירת קשר');
        }
    };

    // Zoom controls
    const handleZoomIn = () => {
        if (svgRef.current && zoomRef.current) {
            d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 1.3);
        }
    };

    const handleZoomOut = () => {
        if (svgRef.current && zoomRef.current) {
            d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 0.7);
        }
    };

    const handleFitView = () => {
        if (svgRef.current && zoomRef.current && containerRef.current) {
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;
            d3.select(svgRef.current).transition().call(
                zoomRef.current.transform,
                d3.zoomIdentity.translate(width / 2, height / 2).scale(0.6)
            );
        }
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
        d3.select(svgRef.current)
            .transition()
            .duration(750)
            .call(
                zoomRef.current.transform,
                d3.zoomIdentity.translate(x, y).scale(scale)
            );

        // Highlight the node with pulsing animation
        // CRITICAL FIX: Select from within the graph-container group
        const svg = d3.select(svgRef.current);
        const graphContainer = svg.select('g.graph-container');
        const nodeGroup = graphContainer.select(`g.node[data-id="${nodeId}"]`);

        // Clear any existing pulsing animation
        if (pulsingIntervalRef.current) {
            clearInterval(pulsingIntervalRef.current);
            pulsingIntervalRef.current = null;
        }

        // Remove any existing pulse rings
        graphContainer.selectAll('.pulse-ring').remove();

        // Hide tooltip during focus
        setTooltip(prev => ({ ...prev, visible: false }));

        if (!nodeGroup.empty()) {
            const circle = nodeGroup.select('circle');
            const radius = 25;

            // 1. Initial gentle flash (עדין יותר)
            circle
                .transition()
                .duration(400)
                .ease(d3.easeCubicInOut)
                .attr('r', 32)
                .transition()
                .duration(400)
                .ease(d3.easeCubicInOut)
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
                    .ease(d3.easeQuadOut)
                    .attr('r', radius + 25)
                    .attr('stroke-width', 1)
                    .attr('opacity', 0)
                    .remove();

                pulseCount++;
            };

            // Start pulsing immediately and then every 600ms
            createPulseRing();
            pulsingIntervalRef.current = setInterval(createPulseRing, 600);
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
            d3.select(svgRef.current).selectAll('.pulse-ring').remove();
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
        <div className="flex flex-col bg-slate-900" style={{ height: 'calc(100vh - 60px)', minHeight: '600px' }}>
            {/* Header */}
            <div className="bg-slate-800/80 backdrop-blur px-4 py-3 flex items-center justify-between border-b border-slate-700 relative z-[100]">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-white">🌐 רשת קהילתית</h1>
                    <span className="text-sm text-slate-400">
                        {nodes.length} בני משפחה • {edges.length} קשרים
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    {/* Search Bar - with fixed z-index */}
                    <div className="relative z-[9999]">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        <input
                            type="text"
                            placeholder="חפש אדם..."
                            value={searchQuery}
                            onChange={(e) => {
                                const query = e.target.value;
                                setSearchQuery(query);
                                if (query.length >= 2) {
                                    const results = nodes.filter(n =>
                                        n.name.toLowerCase().includes(query.toLowerCase())
                                    );
                                    setSearchResults(results);
                                } else {
                                    setSearchResults([]);
                                }
                            }}
                            className="pr-9 pl-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:border-amber-500 w-48 relative z-10"
                        />
                        {searchResults.length > 0 && (
                            <div className="absolute top-full mt-1 right-0 w-80 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl max-h-80 overflow-y-auto">
                                {searchResults.map(result => (
                                    <button
                                        key={result.id}
                                        onClick={() => {
                                            // Focus on the node with zoom and highlight
                                            focusOnNode(result.id);
                                            setSearchQuery('');
                                            setSearchResults([]);
                                        }}
                                        className="w-full text-right px-4 py-2.5 hover:bg-slate-700 transition-colors text-sm border-b border-slate-700 last:border-b-0"
                                    >
                                        <div className="font-medium text-white mb-1">{result.name}</div>
                                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400">
                                            {result.birthYear && (
                                                <span>📅 {result.birthYear}</span>
                                            )}
                                            {result.birthPlace && (
                                                <span>🏙️ {result.birthPlace}</span>
                                            )}
                                            {result.isAlive && result.currentResidence && (
                                                <span>📍 {result.currentResidence}</span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="w-px h-6 bg-slate-600" />

                    {/* Add Person Button */}
                    <button
                        onClick={() => {
                            setSelectedMember(null);
                            setIsEditModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white text-sm font-medium transition-colors"
                    >
                        <UserPlus size={16} />
                        <span>הוסף אדם</span>
                    </button>

                    {/* Connection Mode Button */}
                    {connectionMode === 'none' ? (
                        <button
                            onClick={startConnectionMode}
                            className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 rounded-lg text-white text-sm font-medium transition-colors"
                        >
                            <Link2 size={16} />
                            <span>חבר אנשים</span>
                        </button>
                    ) : (
                        <button
                            onClick={cancelConnection}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm font-medium transition-colors"
                        >
                            <X size={16} />
                            <span>ביטול</span>
                        </button>
                    )}


                    {/* Legend - as popup button */}
                    <div className="relative">
                        <button
                            onClick={() => setShowLegend(!showLegend)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-sm transition-colors"
                        >
                            <Info size={14} />
                            <span>מקרא</span>
                        </button>

                        {showLegend && (
                            <>
                                {/* Backdrop to close */}
                                <div
                                    className="fixed inset-0 z-[9998]"
                                    onClick={() => setShowLegend(false)}
                                />

                                {/* Legend popup */}
                                <div className="absolute left-0 top-full mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl p-4 z-[9999] w-80">
                                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                        <Info size={14} />
                                        מקרא סימנים
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2 pb-2 border-b border-slate-700">
                                            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-blue-600" />
                                            <span className="text-slate-300">גבר</span>
                                            <div className="w-4 h-4 rounded-full bg-pink-500 border-2 border-pink-600 mr-auto" />
                                            <span className="text-slate-300">אישה</span>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <svg width="32" height="12" className="flex-shrink-0">
                                                    <line x1="0" y1="6" x2="32" y2="6" stroke="#38bdf8" strokeWidth="2.5" />
                                                </svg>
                                                <span className="text-slate-300">הורה-ילד</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <svg width="32" height="12" className="flex-shrink-0">
                                                    <line x1="0" y1="6" x2="32" y2="6" stroke="#f472b6" strokeWidth="3" />
                                                </svg>
                                                <span className="text-slate-300">נשואים</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <svg width="32" height="12" className="flex-shrink-0">
                                                    <line x1="0" y1="6" x2="32" y2="6" stroke="#f87171" strokeWidth="3" strokeDasharray="5,5" />
                                                </svg>
                                                <span className="text-slate-300">גרושים</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <svg width="32" height="12" className="flex-shrink-0">
                                                    <line x1="0" y1="6" x2="32" y2="6" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="2,4" />
                                                </svg>
                                                <span className="text-slate-300">אלמן/ה</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <svg width="32" height="12" className="flex-shrink-0">
                                                    <line x1="0" y1="6" x2="32" y2="6" stroke="#a78bfa" strokeWidth="2" strokeDasharray="8,4" />
                                                </svg>
                                                <span className="text-slate-300">אחים</span>
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
                        ? `נבחר: ${firstSelectedNode.name} - כעת בחר את האדם השני לחיבור`
                        : 'לחץ על אדם ראשון לחיבור'}
                </div>
            )}

            {/* Graph Container */}
            <div ref={containerRef} className="flex-1 relative overflow-hidden z-0" style={{ minHeight: '500px' }}>
                <svg
                    ref={svgRef}
                    width="100%"
                    height="100%"
                    style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', display: 'block' }}
                />

                {/* Connection Type Selection Modal */}
                {connectionMode === 'selecting-type' && firstSelectedNode && secondSelectedNode && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-50" onClick={cancelConnection}>
                        <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-slate-700" onClick={e => e.stopPropagation()}>
                            <h3 className="text-xl font-bold text-white mb-4 text-center">בחר סוג קשר</h3>
                            <p className="text-sm text-slate-300 mb-6 text-center">
                                בין <span className="font-bold text-amber-400">{firstSelectedNode.name}</span> ל-<span className="font-bold text-amber-400">{secondSelectedNode.name}</span>
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => createConnection('parent-child')}
                                    className="w-full flex items-center gap-3 p-4 bg-sky-600 hover:bg-sky-700 rounded-lg text-white transition-colors"
                                >
                                    <div className="w-10 h-1 bg-sky-400" />
                                    <div className="flex-1 text-right">
                                        <div className="font-bold">הורה-ילד</div>
                                        <div className="text-xs text-sky-200">{firstSelectedNode.name} הוא/היא הורה של {secondSelectedNode.name}</div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => createConnection('spouse')}
                                    className="w-full flex items-center gap-3 p-4 bg-pink-600 hover:bg-pink-700 rounded-lg text-white transition-colors"
                                >
                                    <div className="w-10 h-1 bg-pink-400" />
                                    <div className="flex-1 text-right">
                                        <div className="font-bold">בני זוג (נשואים)</div>
                                        <div className="text-xs text-pink-200">{firstSelectedNode.name} ו-{secondSelectedNode.name} נשואים</div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => createConnection('sibling')}
                                    className="w-full flex items-center gap-3 p-4 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors"
                                >
                                    <div className="w-10 h-1 bg-purple-400 border-dashed" />
                                    <div className="flex-1 text-right">
                                        <div className="font-bold">אחים</div>
                                        <div className="text-xs text-purple-200">{firstSelectedNode.name} ו-{secondSelectedNode.name} הם אחים</div>
                                    </div>
                                </button>
                            </div>

                            <button
                                onClick={cancelConnection}
                                className="w-full mt-4 px-4 py-2 text-slate-400 hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                ביטול
                            </button>
                        </div>
                    </div>
                )}

                {/* Zoom Controls */}
                <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                    <button
                        onClick={handleZoomIn}
                        className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
                        title="הגדל"
                    >
                        <ZoomIn size={20} />
                    </button>
                    <button
                        onClick={handleZoomOut}
                        className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
                        title="הקטן"
                    >
                        <ZoomOut size={20} />
                    </button>
                    <button
                        onClick={handleFitView}
                        className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
                        title="התאם לתצוגה"
                    >
                        <Maximize2 size={20} />
                    </button>
                </div>

                {/* Force Controls Panel */}
                <div className="absolute bottom-4 left-4 flex flex-col gap-2">
                    {/* Toggle button */}
                    <button
                        onClick={() => setShowControls(!showControls)}
                        className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
                        title="הגדרות כוחות"
                    >
                        <Sliders size={20} />
                    </button>

                    {/* Controls panel */}
                    {showControls && (
                        <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 shadow-2xl w-80 max-h-96 overflow-y-auto">
                            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                <Sliders size={14} />
                                כוחות המשיכה
                            </h3>

                            <div className="space-y-4 text-sm">
                                {/* Parent-Child Strength */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-slate-300">חוזק הורה-ילד</label>
                                        <span className="text-amber-400 font-mono">{forceParams.parentChildStrength.toFixed(2)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={forceParams.parentChildStrength}
                                        onChange={(e) => setForceParams(prev => ({ ...prev, parentChildStrength: parseFloat(e.target.value) }))}
                                        className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                    />
                                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                                        <span>חלש</span>
                                        <span>חזק</span>
                                    </div>
                                </div>

                                {/* Parent-Child Distance */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-slate-300">מרחק הורה-ילד</label>
                                        <span className="text-amber-400 font-mono">{forceParams.parentChildDistance}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="50"
                                        max="200"
                                        step="10"
                                        value={forceParams.parentChildDistance}
                                        onChange={(e) => setForceParams(prev => ({ ...prev, parentChildDistance: parseInt(e.target.value) }))}
                                        className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                    />
                                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                                        <span>קרוב</span>
                                        <span>רחוק</span>
                                    </div>
                                </div>

                                {/* Spouse Strength */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-slate-300">חוזק בני זוג</label>
                                        <span className="text-pink-400 font-mono">{forceParams.spouseStrength.toFixed(2)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={forceParams.spouseStrength}
                                        onChange={(e) => setForceParams(prev => ({ ...prev, spouseStrength: parseFloat(e.target.value) }))}
                                        className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-pink-500"
                                    />
                                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                                        <span>חלש</span>
                                        <span>חזק</span>
                                    </div>
                                </div>

                                {/* Spouse Distance */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-slate-300">מרחק בני זוג</label>
                                        <span className="text-pink-400 font-mono">{forceParams.spouseDistance}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="40"
                                        max="150"
                                        step="10"
                                        value={forceParams.spouseDistance}
                                        onChange={(e) => setForceParams(prev => ({ ...prev, spouseDistance: parseInt(e.target.value) }))}
                                        className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-pink-500"
                                    />
                                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                                        <span>קרוב</span>
                                        <span>רחוק</span>
                                    </div>
                                </div>

                                {/* Charge (Repulsion) */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-slate-300">דחייה</label>
                                        <span className="text-red-400 font-mono">{forceParams.charge}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="-1000"
                                        max="-50"
                                        step="50"
                                        value={forceParams.charge}
                                        onChange={(e) => setForceParams(prev => ({ ...prev, charge: parseInt(e.target.value) }))}
                                        className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-red-500"
                                    />
                                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                                        <span>חזק</span>
                                        <span>חלש</span>
                                    </div>
                                </div>

                                {/* Collision Radius */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-slate-300">רדיוס התנגשות</label>
                                        <span className="text-blue-400 font-mono">{forceParams.collisionRadius}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="20"
                                        max="80"
                                        step="5"
                                        value={forceParams.collisionRadius}
                                        onChange={(e) => setForceParams(prev => ({ ...prev, collisionRadius: parseInt(e.target.value) }))}
                                        className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                                        <span>קטן</span>
                                        <span>גדול</span>
                                    </div>
                                </div>

                                {/* Y-Force Strength */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-slate-300">יישור ציר זמן (Y)</label>
                                        <span className="text-emerald-400 font-mono">{forceParams.yForceStrength.toFixed(2)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={forceParams.yForceStrength}
                                        onChange={(e) => setForceParams(prev => ({ ...prev, yForceStrength: parseFloat(e.target.value) }))}
                                        className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                    />
                                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                                        <span>חופשי</span>
                                        <span>קשיח</span>
                                    </div>
                                </div>

                                {/* Reset button */}
                                <button
                                    onClick={() => setForceParams({
                                        parentChildStrength: 1.00,
                                        spouseStrength: 1.00,
                                        charge: -650,
                                        parentChildDistance: 50,
                                        spouseDistance: 70,
                                        collisionRadius: 20,
                                        yForceStrength: 1.00
                                    })}
                                    className="w-full mt-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-xs transition-colors"
                                >
                                    איפוס לברירת מחדל
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tooltip */}
            {tooltip.visible && tooltip.member && (
                <div
                    className="absolute z-[200] pointer-events-none"
                    style={{
                        left: `${tooltip.x}px`,
                        top: `${tooltip.y}px`,
                        transform: 'translate(-50%, -100%)'
                    }}
                >
                    <div className="bg-slate-800 border-2 border-slate-600 rounded-lg shadow-2xl p-4 min-w-[250px] max-w-[350px]" dir="rtl">
                        {/* Header with photo */}
                        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-600">
                            {tooltip.member.photo_url ? (
                                <img
                                    src={tooltip.member.photo_url}
                                    alt={tooltip.member.first_name}
                                    className="w-16 h-16 rounded-full object-cover border-2 border-slate-500"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center border-2 border-slate-500">
                                    <User size={32} className="text-slate-400" />
                                </div>
                            )}
                            <div className="flex-1">
                                <h3 className="font-bold text-white text-lg">
                                    {tooltip.member.title && `${tooltip.member.title} `}
                                    {tooltip.member.first_name} {tooltip.member.last_name}
                                </h3>
                                {tooltip.member.nickname && (
                                    <p className="text-sm text-slate-400">"{tooltip.member.nickname}"</p>
                                )}
                            </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-2 text-sm">
                            {/* Birth info */}
                            {(tooltip.member.birth_date || tooltip.member.birth_place) && (
                                <div className="flex items-start gap-2">
                                    <span className="text-emerald-400">📅</span>
                                    <div className="flex-1 text-slate-200">
                                        <span className="font-medium">נולד:</span>{' '}
                                        {tooltip.member.birth_date && new Date(tooltip.member.birth_date).toLocaleDateString('he-IL')}
                                        {tooltip.member.birth_place && ` ב${tooltip.member.birth_place}`}
                                    </div>
                                </div>
                            )}

                            {/* Death info */}
                            {!tooltip.member.is_alive && (
                                <div className="flex items-start gap-2">
                                    <span className="text-slate-400">🕊️</span>
                                    <div className="flex-1 text-slate-200">
                                        <span className="font-medium">נפטר:</span>{' '}
                                        {tooltip.member.death_date && new Date(tooltip.member.death_date).toLocaleDateString('he-IL')}
                                        {tooltip.member.death_place && ` ב${tooltip.member.death_place}`}
                                    </div>
                                </div>
                            )}

                            {/* Current residence */}
                            {tooltip.member.is_alive && tooltip.member.current_residence && (
                                <div className="flex items-start gap-2">
                                    <span className="text-blue-400">📍</span>
                                    <div className="flex-1 text-slate-200">
                                        <span className="font-medium">מתגורר:</span> {tooltip.member.current_residence}
                                    </div>
                                </div>
                            )}

                            {/* Maiden name */}
                            {tooltip.member.maiden_name && (
                                <div className="flex items-start gap-2">
                                    <span className="text-pink-400">💝</span>
                                    <div className="flex-1 text-slate-200">
                                        <span className="font-medium">שם נעורים:</span> {tooltip.member.maiden_name}
                                    </div>
                                </div>
                            )}

                            {/* Biography snippet */}
                            {tooltip.member.biography && (
                                <div className="flex items-start gap-2 mt-3 pt-3 border-t border-slate-700">
                                    <span className="text-amber-400">📖</span>
                                    <div className="flex-1 text-slate-300 text-xs italic line-clamp-3">
                                        {tooltip.member.biography}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Hint */}
                        <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-400 text-center">
                            לחץ לעריכה • לחיצה ימנית למידע נוסף
                        </div>
                    </div>

                    {/* Arrow pointing down */}
                    <div
                        className="absolute left-1/2 -bottom-2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-slate-600"
                        style={{ transform: 'translateX(-50%)' }}
                    />
                </div>
            )}

            {/* Edit Modal */}
            <EditMemberModal
                isOpen={isEditModalOpen}
                member={selectedMember}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedMember(null);
                }}
                onSuccess={() => {
                    setIsEditModalOpen(false);
                    setSelectedMember(null);
                    loadData();
                }}
                potentialRelations={allMembers}
            />
        </div>
    );
};

export default CommunityGraph;
