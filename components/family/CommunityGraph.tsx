/**
 * CommunityGraph.tsx
 * D3.js Force-Directed Graph for Community Family Visualization
 * Shows all members as nodes with relationships as edges
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { familyService, FamilyMember } from '../../services/familyService';
import { EditMemberModal } from './EditMemberModal';
import { AddMemberModal } from './AddMemberModal';
import { Loader2, ZoomIn, ZoomOut, Maximize2, UserPlus } from 'lucide-react';

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
}

interface CommunityGraphProps {
    onMemberSelect?: (member: FamilyMember) => void;
}

export const CommunityGraph: React.FC<CommunityGraphProps> = ({ onMemberSelect }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [loading, setLoading] = useState(true);
    const [nodes, setNodes] = useState<GraphNode[]>([]);
    const [edges, setEdges] = useState<GraphEdge[]>([]);
    const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);

    // Edit modal state
    const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
                    type: 'spouse'
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
            const nodeIds = new Set(graphNodes.map(n => n.id));
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
                .attr('x1', 0)
                .attr('y1', yPos)
                .attr('x2', width)
                .attr('y2', yPos)
                .attr('stroke', 'rgba(255,255,255,0.1)')
                .attr('stroke-width', 1)
                .attr('pointer-events', 'none');

            // Year label
            g.append('text')
                .attr('x', 15)
                .attr('y', yPos + 5)
                .attr('font-size', '12px')
                .attr('fill', 'rgba(255,255,255,0.4)')
                .attr('pointer-events', 'none')
                .text(year.toString());
        }

        // Create force simulation with birth-year based Y positioning
        const simulation = d3.forceSimulation<GraphNode>(nodes)
            .force('link', d3.forceLink<GraphNode, GraphEdge>(edges)
                .id(d => d.id)
                .distance(d => d.type === 'spouse' ? 50 : 80)
                .strength(d => d.type === 'spouse' ? 2 : 0.3)
            )
            .force('charge', d3.forceManyBody().strength(-400))
            .force('x', d3.forceX(width / 2).strength(0.15))
            .force('y', d3.forceY<GraphNode>(d => yearToY(d.birthYear ?? ((minYear + maxYear) / 2))).strength(0.9))
            .force('collision', d3.forceCollide().radius(45));

        // Edge colors by type
        const edgeColor = (type: string) => {
            switch (type) {
                case 'spouse': return '#ec4899'; // Pink
                case 'parent-child': return '#0ea5e9'; // Sky blue
                case 'sibling': return '#22c55e'; // Green
                default: return '#94a3b8'; // Gray
            }
        };

        // Draw edges
        const link = g.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(edges)
            .enter()
            .append('line')
            .attr('stroke', d => edgeColor(d.type))
            .attr('stroke-width', d => d.type === 'spouse' ? 3 : 2)
            .attr('stroke-opacity', 0.7)
            .attr('stroke-dasharray', d => d.type === 'spouse' ? '5,5' : 'none');

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

        // Click handler
        node.on('click', (event, d) => {
            event.stopPropagation();
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

        // Simulation tick
        simulation.on('tick', () => {
            link
                .attr('x1', d => (d.source as GraphNode).x || 0)
                .attr('y1', d => (d.source as GraphNode).y || 0)
                .attr('x2', d => (d.target as GraphNode).x || 0)
                .attr('y2', d => (d.target as GraphNode).y || 0);

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
    }, [loading, nodes, edges, allMembers]);

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

                <div className="flex items-center gap-4">
                    {/* Add Person Button */}
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                        <UserPlus size={16} />
                        <span>הוסף אדם</span>
                    </button>

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
                            <div className="w-6 h-0.5 bg-sky-500" />
                            <span className="text-slate-300">הורה-ילד</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-6 h-0.5 bg-pink-500" style={{ borderStyle: 'dashed' }} />
                            <span className="text-slate-300">בני זוג</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Graph Container */}
            <div ref={containerRef} className="flex-1 relative overflow-hidden" style={{ minHeight: '500px' }}>
                <svg
                    ref={svgRef}
                    width="100%"
                    height="100%"
                    style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', display: 'block' }}
                />

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
            />

            {/* Add Member Modal */}
            <AddMemberModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    setIsAddModalOpen(false);
                    loadData();
                }}
            />
        </div>
    );
};

export default CommunityGraph;
