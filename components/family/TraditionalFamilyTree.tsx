/**
 * TraditionalFamilyTree.tsx
 * Traditional hierarchical family tree using D3 tree layout
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { familyService, FamilyMember } from '../../services/familyService';
import { EditMemberModal } from './EditMemberModal';
import { Loader2, UserPlus, Search, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface TreeNode extends d3.HierarchyNode<FamilyMember> {
    x?: number;
    y?: number;
}

interface ParentChildRelation {
    parent_id: number;
    child_id: number;
}

export const TraditionalFamilyTree: React.FC = () => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [parentChildRelations, setParentChildRelations] = useState<ParentChildRelation[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<FamilyMember[]>([]);
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

    // Load data from API
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await familyService.getTreeData();
            setMembers(data.members || []);
            setParentChildRelations(data.parentChild || []);
            console.log('[TraditionalFamilyTree] Loaded:', data.members?.length, 'members,', data.parentChild?.length, 'parent-child relations');
        } catch (error) {
            console.error('[TraditionalFamilyTree] Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Build hierarchical tree from flat data
    const buildHierarchy = useCallback((): FamilyMember => {
        if (members.length === 0) {
            // Return dummy root
            return {
                id: -1,
                first_name: 'כל',
                last_name: 'המשפחות',
                gender: 'unknown' as any,
                is_alive: false,
            };
        }

        // Find root nodes (people who are not children in any parent-child relation)
        const childIds = new Set(parentChildRelations.map(rel => rel.child_id));
        const roots = members.filter(m => !childIds.has(m.id));

        console.log('[TraditionalFamilyTree] Found', roots.length, 'root nodes:', roots.map(r => `${r.first_name} ${r.last_name}`));

        // Create virtual root that connects all real roots
        const virtualRoot: FamilyMember = {
            id: -1,
            first_name: 'כל',
            last_name: 'המשפחות',
            gender: 'unknown' as any,
            is_alive: false,
        };

        return virtualRoot;
    }, [members, parentChildRelations]);

    // Get children of a person using parent-child relations
    const getChildren = useCallback((parentId: number): FamilyMember[] => {
        // Special case: virtual root (-1) returns all real roots
        if (parentId === -1) {
            const childIds = new Set(parentChildRelations.map(rel => rel.child_id));
            const roots = members.filter(m => !childIds.has(m.id));
            console.log(`[TraditionalFamilyTree] Virtual root has ${roots.length} root families`);
            return roots;
        }

        // Find all child IDs for this parent
        const childIds = parentChildRelations
            .filter(rel => rel.parent_id === parentId)
            .map(rel => rel.child_id);

        // Get the actual member objects
        const children = members.filter(m => childIds.includes(m.id));

        if (children.length > 0) {
            console.log(`[TraditionalFamilyTree] Parent ${parentId} has ${children.length} children:`, children.map(c => c.first_name));
        }
        return children;
    }, [members, parentChildRelations]);

    // Initialize D3 tree
    useEffect(() => {
        if (!svgRef.current || !containerRef.current || loading || members.length === 0) return;

        const svg = d3.select(svgRef.current);
        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        console.log('[TraditionalFamilyTree] Initializing tree with', members.length, 'members');

        // Clear previous
        svg.selectAll('*').remove();

        // Create main group for zoom/pan
        const g = svg.append('g').attr('class', 'tree-container');

        // Setup zoom
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);
        zoomRef.current = zoom;

        // Build hierarchy
        const root = buildHierarchy();
        console.log('[TraditionalFamilyTree] Root:', root.first_name, root.last_name, 'ID:', root.id);

        // Create D3 hierarchy
        const hierarchy = d3.hierarchy(root, (d: FamilyMember) => {
            const children = getChildren(d.id);
            return children.length > 0 ? children : null;
        });

        console.log('[TraditionalFamilyTree] Hierarchy depth:', hierarchy.height, 'Total nodes:', hierarchy.descendants().length);

        // Create tree layout
        const treeLayout = d3.tree<FamilyMember>()
            .size([width - 200, height - 200])
            .separation((a, b) => (a.parent === b.parent ? 1 : 2));

        // Apply layout
        const treeData = treeLayout(hierarchy);

        // Filter out virtual root from display
        const nodesToDisplay = treeData.descendants().filter(d => d.data.id !== -1);
        const linksToDisplay = treeData.links().filter(l => l.source.data.id !== -1 && l.target.data.id !== -1);

        console.log('[TraditionalFamilyTree] Displaying', nodesToDisplay.length, 'nodes (filtered virtual root)');

        // Draw links (lines between nodes)
        g.selectAll('.link')
            .data(linksToDisplay)
            .enter()
            .append('path')
            .attr('class', 'link')
            .attr('d', d3.linkVertical<any, TreeNode>()
                .x(d => (d.x || 0) + 100)
                .y(d => (d.y || 0) + 100)
            )
            .attr('fill', 'none')
            .attr('stroke', '#64748b')
            .attr('stroke-width', 2);

        // Draw nodes
        const node = g.selectAll('.node')
            .data(nodesToDisplay)
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${(d.x || 0) + 100},${(d.y || 0) + 100})`)
            .style('cursor', 'pointer')
            .on('click', (event, d) => {
                event.stopPropagation();
                setSelectedMember(d.data);
                setIsEditModalOpen(true);
            });

        // Node background card
        node.append('rect')
            .attr('x', -80)
            .attr('y', -40)
            .attr('width', 160)
            .attr('height', 80)
            .attr('rx', 8)
            .attr('fill', d => d.data.gender === 'female' ? '#fce7f3' : '#dbeafe')
            .attr('stroke', d => d.data.gender === 'female' ? '#ec4899' : '#3b82f6')
            .attr('stroke-width', 3);

        // Node text - name
        node.append('text')
            .attr('dy', -10)
            .attr('text-anchor', 'middle')
            .attr('fill', '#1e293b')
            .attr('font-weight', 'bold')
            .attr('font-size', '14px')
            .text(d => `${d.data.first_name} ${d.data.last_name || ''}`);

        // Node text - birth year
        node.append('text')
            .attr('dy', 10)
            .attr('text-anchor', 'middle')
            .attr('fill', '#64748b')
            .attr('font-size', '12px')
            .text(d => d.data.birth_date ? `📅 ${new Date(d.data.birth_date).getFullYear()}` : '');

        // Node text - location
        node.append('text')
            .attr('dy', 28)
            .attr('text-anchor', 'middle')
            .attr('fill', '#64748b')
            .attr('font-size', '11px')
            .text(d => {
                if (d.data.is_alive && d.data.current_residence) {
                    return `📍 ${d.data.current_residence}`;
                } else if (d.data.birth_place) {
                    return `🏙️ ${d.data.birth_place}`;
                }
                return '';
            });

        // Center the view
        const bounds = g.node()?.getBBox();
        if (bounds) {
            const fullWidth = bounds.width;
            const fullHeight = bounds.height;
            const midX = bounds.x + fullWidth / 2;
            const midY = bounds.y + fullHeight / 2;

            const scale = Math.min(width / fullWidth, height / fullHeight) * 0.8;
            const translateX = width / 2 - midX * scale;
            const translateY = height / 2 - midY * scale;

            svg.call(zoom.transform as any, d3.zoomIdentity.translate(translateX, translateY).scale(scale));
        }

        console.log('[TraditionalFamilyTree] Tree initialized successfully');
    }, [members, loading, buildHierarchy, getChildren]);

    // Search functionality
    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query.length >= 2) {
            const results = members.filter(m =>
                `${m.first_name} ${m.last_name}`.toLowerCase().includes(query.toLowerCase())
            );
            setSearchResults(results);
        } else {
            setSearchResults([]);
        }
    };

    // Focus on person
    const focusOnPerson = (memberId: number) => {
        const member = members.find(m => m.id === memberId);
        if (member) {
            setSelectedMember(member);
            setIsEditModalOpen(true);
        }
        setSearchQuery('');
        setSearchResults([]);
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
        if (!svgRef.current || !zoomRef.current || !containerRef.current) return;

        const svg = d3.select(svgRef.current);
        const g = svg.select('.tree-container');
        const bounds = (g.node() as SVGGElement)?.getBBox();

        if (bounds) {
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;
            const fullWidth = bounds.width;
            const fullHeight = bounds.height;
            const midX = bounds.x + fullWidth / 2;
            const midY = bounds.y + fullHeight / 2;

            const scale = Math.min(width / fullWidth, height / fullHeight) * 0.8;
            const translateX = width / 2 - midX * scale;
            const translateY = height / 2 - midY * scale;

            svg.transition().call(zoomRef.current.transform as any, d3.zoomIdentity.translate(translateX, translateY).scale(scale));
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
                    <h1 className="text-xl font-bold text-white">🌳 אילן היוחסין</h1>
                    <span className="text-sm text-slate-400">
                        {members.length} בני משפחה
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    {/* Search Bar */}
                    <div className="relative z-[9999]">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        <input
                            type="text"
                            placeholder="חפש אדם..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="pr-9 pl-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:border-amber-500 w-48 relative z-10"
                        />
                        {searchResults.length > 0 && (
                            <div className="absolute top-full mt-1 right-0 w-80 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl max-h-80 overflow-y-auto">
                                {searchResults.map(result => (
                                    <button
                                        key={result.id}
                                        onClick={() => focusOnPerson(result.id)}
                                        className="w-full text-right px-4 py-2.5 hover:bg-slate-700 transition-colors text-sm border-b border-slate-700 last:border-b-0"
                                    >
                                        <div className="font-medium text-white mb-1">{result.first_name} {result.last_name}</div>
                                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400">
                                            {result.birth_date && (
                                                <span>📅 {new Date(result.birth_date).getFullYear()}</span>
                                            )}
                                            {result.birth_place && (
                                                <span>🏙️ {result.birth_place}</span>
                                            )}
                                            {result.is_alive && result.current_residence && (
                                                <span>📍 {result.current_residence}</span>
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
                </div>
            </div>

            {/* Tree Container */}
            <div ref={containerRef} className="flex-1 relative overflow-hidden bg-slate-900">
                <svg
                    ref={svgRef}
                    width="100%"
                    height="100%"
                    style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', display: 'block' }}
                />

                {/* Zoom Controls */}
                <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
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
                potentialRelations={members}
            />
        </div>
    );
};

export default TraditionalFamilyTree;
