/**
 * CommunityGraph.tsx
 * D3.js Force-Directed Graph for Community Family Visualization
 * Shows all members as nodes with relationships as edges
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { familyService, FamilyMember } from '../../services/familyService';
import { EditMemberModal } from './EditMemberModal';
import { Loader2, ZoomIn, ZoomOut, Maximize2, UserPlus, Link2, X, Search } from 'lucide-react';

interface GraphNode extends d3.SimulationNodeDatum {
    id: number;
    name: string;
    gender: 'male' | 'female' | 'other';
    birthYear?: number;
    family?: string;
    generation?: number;  // 0 = oldest ancestor, higher = younger generation
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

    // Edit modal state
    const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Connection mode state
    const [connectionMode, setConnectionMode] = useState<ConnectionMode>('none');
    const [firstSelectedNode, setFirstSelectedNode] = useState<GraphNode | null>(null);
    const [secondSelectedNode, setSecondSelectedNode] = useState<GraphNode | null>(null);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<GraphNode[]>([]);

    // Zoom ref for controls
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

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
                family: m.last_name || 'Unknown'
            }));

            // Convert to graph edges
            const graphEdges: GraphEdge[] = [];

            // Parent-child relationships
            parentChild.forEach((pc: any) => {
                graphEdges.push({
                    source: pc.parent_id,
                    target: pc.child_id,
                    type: 'parent-child'
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

            setNodes(graphNodes);
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

    // Build the D3 visualization
    useEffect(() => {
        if (loading || nodes.length === 0 || !svgRef.current || !containerRef.current) return;

        const svg = d3.select(svgRef.current);
        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Clear previous
        svg.selectAll('*').remove();

        // Create main group for zoom/pan
        const g = svg.append('g').attr('class', 'graph-container');

        // Setup zoom
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);
        zoomRef.current = zoom;

        // Calculate year range for timeline positioning
        const years = nodes.map(n => n.birthYear).filter(y => y) as number[];
        const minYear = years.length > 0 ? Math.min(...years) : 1940;
        const maxYear = years.length > 0 ? Math.max(...years) : 2025;
        const yearSpan = Math.max(maxYear - minYear, 50); // At least 50 years span
        const padding = 80; // Top and bottom padding
        const leftPadding = 60; // Left padding for year labels

        // Helper to convert year to Y position
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

        // Create force simulation with birth-year based Y positioning
        const simulation = d3.forceSimulation<GraphNode>(nodes)
            .force('link', d3.forceLink<GraphNode, GraphEdge>(edges)
                .id(d => d.id)
                .distance(d => {
                    if (d.type === 'spouse') return 80;  // בני זוג קרובים
                    if (d.type === 'parent-child') return 120;  // הורה-ילד רחוק יותר
                    return 100;
                })
                .strength(d => d.type === 'spouse' ? 0.8 : 0.5)
            )
            .force('charge', d3.forceManyBody().strength(-600))
            .force('x', d3.forceX(width / 2).strength(0.1))
            .force('y', d3.forceY<GraphNode>(d => yearToY(d.birthYear ?? ((minYear + maxYear) / 2))).strength(0.6))
            .force('collision', d3.forceCollide().radius(50));

        // Edge colors and styles - improved visibility
        const getEdgeColor = (d: GraphEdge) => {
            if (d.type === 'spouse') {
                if (d.status === 'divorced') return '#f87171'; // Bright red for divorced
                if (d.status === 'widowed') return '#94a3b8'; // Slate for widowed
                return '#f472b6'; // Bright pink for married
            }
            if (d.type === 'parent-child') return '#38bdf8'; // Bright sky blue
            if (d.type === 'sibling') return '#a78bfa'; // Purple for siblings
            return '#94a3b8';
        };

        const getEdgeDash = (d: GraphEdge) => {
            if (d.type === 'spouse') {
                if (d.status === 'divorced') return '5,5'; // Dashed for divorced
                if (d.status === 'widowed') return '2,4'; // Dotted for widowed
                return 'none'; // Solid for married
            }
            if (d.type === 'sibling') return '8,4'; // Long dash for siblings
            return 'none';
        };

        const getEdgeWidth = (d: GraphEdge) => {
            if (d.type === 'spouse') return 3;
            if (d.type === 'parent-child') return 2.5;
            if (d.type === 'sibling') return 2;
            return 2;
        };

        // Draw edges as paths (Orthogonal routing)
        const link = g.append('g')
            .attr('class', 'links')
            .selectAll('path')
            .data(edges)
            .enter()
            .append('path')
            .attr('stroke', d => getEdgeColor(d))
            .attr('stroke-width', d => getEdgeWidth(d))
            .attr('stroke-opacity', 0.7)
            .attr('fill', 'none')
            .attr('stroke-dasharray', d => getEdgeDash(d))
            .attr('stroke-linecap', 'round');

        // Draw nodes
        const node = g.append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(nodes)
            .enter()
            .append('g')
            .attr('class', 'node')
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

        // Node labels (name below)
        node.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '45px')
            .attr('font-size', '11px')
            .attr('fill', '#fff')
            .attr('pointer-events', 'none')
            .text(d => d.name.length > 15 ? d.name.substring(0, 12) + '...' : d.name);

        // Click handler - support connection mode
        node.on('click', (event, d) => {
            event.stopPropagation();

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

        // Hover effects
        node.on('mouseenter', function () {
            d3.select(this).select('circle')
                .transition()
                .duration(200)
                .attr('r', 30);
        });

        node.on('mouseleave', function () {
            d3.select(this).select('circle')
                .transition()
                .duration(200)
                .attr('r', 25);
        });

        // Simulation tick - update path d attribute
        simulation.on('tick', () => {
            link.attr('d', d => {
                const source = d.source as GraphNode;
                const target = d.target as GraphNode;
                const sx = source.x || 0;
                const sy = source.y || 0;
                const tx = target.x || 0;
                const ty = target.y || 0;

                // Orthogonal routing (Step-line)
                // Move vertical, then horizontal, then vertical
                const midY = (sy + ty) / 2;

                // For parent-child, we want to go down from parent, then horizontal, then down to child
                if (d.type === 'parent-child') {
                    // Ensure parent is source (usually upper year/lower y value)
                    // Actually, simulation doesn't guarantee source/target order by Y, but visually:
                    return `M ${sx} ${sy} L ${sx} ${midY} L ${tx} ${midY} L ${tx} ${ty}`;
                }

                // For spouses (same generation approx), go horizontal first?
                // Or just straight line for spouses looks okay with orthogonal too
                // Let's try simple step: V -> H -> V
                // If they are on same Y, midY is same, so it becomes just H line? No, sy=ty.
                // If sy=ty, it draws straight line.
                // If not, it steps.
                return `M ${sx} ${sy} L ${sx} ${midY} L ${tx} ${midY} L ${tx} ${ty}`;
            });

            node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
        });

        // Drag functions
        function dragstarted(event: d3.D3DragEvent<SVGGElement, GraphNode, unknown>, d: GraphNode) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
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
            <div className="bg-slate-800/80 backdrop-blur px-4 py-3 flex items-center justify-between border-b border-slate-700">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-white">🌐 רשת קהילתית</h1>
                    <span className="text-sm text-slate-400">
                        {nodes.length} בני משפחה • {edges.length} קשרים
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
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
                            className="pr-9 pl-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:border-amber-500 w-48"
                        />
                        {searchResults.length > 0 && (
                            <div className="absolute top-full mt-1 w-64 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-64 overflow-y-auto z-50">
                                {searchResults.map(result => (
                                    <button
                                        key={result.id}
                                        onClick={() => {
                                            const member = allMembers.find(m => m.id === result.id);
                                            if (member) {
                                                setSelectedMember(member);
                                                setIsEditModalOpen(true);
                                                setSearchQuery('');
                                                setSearchResults([]);
                                            }
                                        }}
                                        className="w-full text-right px-4 py-2 hover:bg-slate-700 transition-colors text-sm"
                                    >
                                        <div className="font-medium text-white">{result.name}</div>
                                        {result.birthYear && (
                                            <div className="text-xs text-slate-400">נולד/ה: {result.birthYear}</div>
                                        )}
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

                    <div className="w-px h-6 bg-slate-600" />

                    {/* Legend */}
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span className="text-slate-300">גבר</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-pink-500" />
                            <span className="text-slate-300">אישה</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <svg width="24" height="12" className="inline">
                                <line x1="0" y1="6" x2="24" y2="6" stroke="#38bdf8" strokeWidth="2.5" />
                            </svg>
                            <span className="text-slate-300">הורה-ילד</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <svg width="24" height="12" className="inline">
                                <line x1="0" y1="6" x2="24" y2="6" stroke="#f472b6" strokeWidth="3" />
                            </svg>
                            <span className="text-slate-300">נשואים</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <svg width="24" height="12" className="inline">
                                <line x1="0" y1="6" x2="24" y2="6" stroke="#f87171" strokeWidth="3" strokeDasharray="5,5" />
                            </svg>
                            <span className="text-slate-300">גרושים</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <svg width="24" height="12" className="inline">
                                <line x1="0" y1="6" x2="24" y2="6" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="2,4" />
                            </svg>
                            <span className="text-slate-300">אלמן/ה</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <svg width="24" height="12" className="inline">
                                <line x1="0" y1="6" x2="24" y2="6" stroke="#a78bfa" strokeWidth="2" strokeDasharray="8,4" />
                            </svg>
                            <span className="text-slate-300">אחים</span>
                        </div>
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
            <div ref={containerRef} className="flex-1 relative overflow-hidden" style={{ minHeight: '500px' }}>
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
            </div>

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
