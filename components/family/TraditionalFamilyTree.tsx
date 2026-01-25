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

interface Partnership {
    person1_id: number;
    person2_id: number;
    partnership_type?: string;
    start_date?: string;
    end_date?: string;
}

interface PositionedMember extends FamilyMember {
    x: number;
    y: number;
    generation: number;
    familyGroupId: number;
}

export const TraditionalFamilyTree: React.FC = () => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [parentChildRelations, setParentChildRelations] = useState<ParentChildRelation[]>([]);
    const [partnerships, setPartnerships] = useState<Partnership[]>([]);
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
            setPartnerships(data.partnerships || []);
            console.log('[TraditionalFamilyTree] Loaded:',
                data.members?.length, 'members,',
                data.parentChild?.length, 'parent-child relations,',
                data.partnerships?.length, 'partnerships'
            );
        } catch (error) {
            console.error('[TraditionalFamilyTree] Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Find connected family groups using Union-Find algorithm
    const findFamilyGroups = useCallback((): Map<number, number> => {
        const parent = new Map<number, number>();

        // Initialize: each person is their own parent
        members.forEach(m => parent.set(m.id, m.id));

        // Find function with path compression
        const find = (id: number): number => {
            if (parent.get(id) !== id) {
                parent.set(id, find(parent.get(id)!));
            }
            return parent.get(id)!;
        };

        // Union function
        const union = (id1: number, id2: number) => {
            const root1 = find(id1);
            const root2 = find(id2);
            if (root1 !== root2) {
                parent.set(root2, root1);
            }
        };

        // Connect through partnerships
        partnerships.forEach(p => {
            union(p.person1_id, p.person2_id);
        });

        // Connect through parent-child relations
        parentChildRelations.forEach(rel => {
            union(rel.parent_id, rel.child_id);
        });

        // Map each person to their family group
        const familyGroups = new Map<number, number>();
        members.forEach(m => {
            familyGroups.set(m.id, find(m.id));
        });

        const groupCount = new Set(familyGroups.values()).size;
        console.log('[TraditionalFamilyTree] Found', groupCount, 'family groups');

        return familyGroups;
    }, [members, partnerships, parentChildRelations]);

    // Calculate generation for each person
    const calculateGenerations = useCallback((familyGroups: Map<number, number>): Map<number, number> => {
        const generations = new Map<number, number>();
        const visited = new Set<number>();

        // Find root nodes (people without parents)
        const childIds = new Set(parentChildRelations.map(rel => rel.child_id));
        const roots = members.filter(m => !childIds.has(m.id));

        console.log('[TraditionalFamilyTree] Found', roots.length, 'root nodes');

        // BFS to assign initial generations based on parent-child relations
        const queue: Array<{ id: number, gen: number }> = [];
        roots.forEach(root => {
            queue.push({ id: root.id, gen: 0 });
            generations.set(root.id, 0);
        });

        while (queue.length > 0) {
            const { id, gen } = queue.shift()!;
            if (visited.has(id)) continue;
            visited.add(id);

            // Get children
            const children = parentChildRelations
                .filter(rel => rel.parent_id === id)
                .map(rel => rel.child_id);

            children.forEach(childId => {
                if (!generations.has(childId) || generations.get(childId)! < gen + 1) {
                    generations.set(childId, gen + 1);
                    queue.push({ id: childId, gen: gen + 1 });
                }
            });
        }

        // Assign generation 0 to anyone not yet assigned (isolated nodes)
        members.forEach(m => {
            if (!generations.has(m.id)) {
                generations.set(m.id, 0);
            }
        });

        // CRITICAL FIX: Normalize generations for spouses
        // Partners must be in the same generation for display
        let changed = true;
        let iterations = 0;
        const maxIterations = 10;

        while (changed && iterations < maxIterations) {
            changed = false;
            iterations++;

            partnerships.forEach(p => {
                const gen1 = generations.get(p.person1_id);
                const gen2 = generations.get(p.person2_id);

                if (gen1 !== undefined && gen2 !== undefined && gen1 !== gen2) {
                    // Move both to the earlier (lower) generation
                    const minGen = Math.min(gen1, gen2);

                    if (gen1 !== minGen) {
                        generations.set(p.person1_id, minGen);
                        changed = true;
                    }
                    if (gen2 !== minGen) {
                        generations.set(p.person2_id, minGen);
                        changed = true;
                    }

                    // Now we need to update all descendants
                    const adjustDescendants = (personId: number, adjustment: number) => {
                        if (adjustment === 0) return;

                        const children = parentChildRelations
                            .filter(rel => rel.parent_id === personId)
                            .map(rel => rel.child_id);

                        children.forEach(childId => {
                            const childGen = generations.get(childId)!;
                            const newGen = childGen + adjustment;
                            generations.set(childId, newGen);
                            adjustDescendants(childId, adjustment);
                        });
                    };

                    if (gen1 > minGen) {
                        adjustDescendants(p.person1_id, minGen - gen1);
                    }
                    if (gen2 > minGen) {
                        adjustDescendants(p.person2_id, minGen - gen2);
                    }
                }
            });
        }

        console.log('[TraditionalFamilyTree] Normalized generations in', iterations, 'iterations');

        return generations;
    }, [members, parentChildRelations, partnerships]);

    // Layout all family members
    const layoutFamilies = useCallback((): PositionedMember[] => {
        const familyGroups = findFamilyGroups();
        const generations = calculateGenerations(familyGroups);

        // Group members by family group
        const groupedMembers = new Map<number, FamilyMember[]>();
        members.forEach(m => {
            const groupId = familyGroups.get(m.id)!;
            if (!groupedMembers.has(groupId)) {
                groupedMembers.set(groupId, []);
            }
            groupedMembers.get(groupId)!.push(m);
        });

        const allPositioned: PositionedMember[] = [];
        const HORIZONTAL_SPACING = 220;
        const VERTICAL_SPACING = 180;
        const FAMILY_GROUP_SPACING = 400;

        let currentFamilyX = 0;

        // Layout each family group separately
        groupedMembers.forEach((groupMembers, groupId) => {
            // Group by generation within this family
            const byGeneration = new Map<number, FamilyMember[]>();
            groupMembers.forEach(m => {
                const gen = generations.get(m.id)!;
                if (!byGeneration.has(gen)) {
                    byGeneration.set(gen, []);
                }
                byGeneration.get(gen)!.push(m);
            });

            // Layout generation by generation, top to bottom
            const minGen = Math.min(...byGeneration.keys());
            const maxGen = Math.max(...byGeneration.keys());

            // Track X positions for each person to position their children below them
            const positionedInFamily = new Map<number, { x: number, y: number }>();
            let maxWidthInFamily = 0;

            for (let gen = minGen; gen <= maxGen; gen++) {
                if (!byGeneration.has(gen)) continue;

                const genMembers = byGeneration.get(gen)!;
                const processed = new Set<number>();
                let currentX = currentFamilyX;

                // For root generation (no parents), sort by birth year
                if (gen === minGen) {
                    genMembers.sort((a, b) => {
                        const yearA = a.birth_date ? new Date(a.birth_date).getFullYear() : 9999;
                        const yearB = b.birth_date ? new Date(b.birth_date).getFullYear() : 9999;
                        return yearA - yearB;
                    });

                    // Position root generation with their partners
                    genMembers.forEach(person => {
                        if (processed.has(person.id)) return;

                        const partners = partnerships
                            .filter(p => p.person1_id === person.id || p.person2_id === person.id)
                            .map(p => p.person1_id === person.id ? p.person2_id : p.person1_id)
                            .map(partnerId => members.find(m => m.id === partnerId))
                            .filter(p => p && generations.get(p.id) === gen) as FamilyMember[];

                        positionedInFamily.set(person.id, { x: currentX, y: gen * VERTICAL_SPACING });
                        allPositioned.push({
                            ...person,
                            x: currentX,
                            y: gen * VERTICAL_SPACING,
                            generation: gen,
                            familyGroupId: groupId
                        });
                        processed.add(person.id);
                        currentX += HORIZONTAL_SPACING;

                        partners.forEach(partner => {
                            if (!processed.has(partner.id)) {
                                positionedInFamily.set(partner.id, { x: currentX, y: gen * VERTICAL_SPACING });
                                allPositioned.push({
                                    ...partner,
                                    x: currentX,
                                    y: gen * VERTICAL_SPACING,
                                    generation: gen,
                                    familyGroupId: groupId
                                });
                                processed.add(partner.id);
                                currentX += HORIZONTAL_SPACING;
                            }
                        });
                    });
                } else {
                    // For child generations, group by parents
                    const childrenByParents = new Map<string, FamilyMember[]>();

                    genMembers.forEach(child => {
                        const parents = parentChildRelations
                            .filter(rel => rel.child_id === child.id)
                            .map(rel => rel.parent_id)
                            .sort()
                            .join('-');

                        if (!childrenByParents.has(parents)) {
                            childrenByParents.set(parents, []);
                        }
                        childrenByParents.get(parents)!.push(child);
                    });

                    // Sort children within each parent group by birth year
                    childrenByParents.forEach(children => {
                        children.sort((a, b) => {
                            const yearA = a.birth_date ? new Date(a.birth_date).getFullYear() : 9999;
                            const yearB = b.birth_date ? new Date(b.birth_date).getFullYear() : 9999;
                            return yearA - yearB;
                        });
                    });

                    // Position children below their parents
                    childrenByParents.forEach((children, parentKey) => {
                        const parentIds = parentKey.split('-').map(Number);

                        // Calculate position below parents
                        let baseX = currentFamilyX;
                        if (parentIds.length > 0 && positionedInFamily.has(parentIds[0])) {
                            const positions = parentIds
                                .map(id => positionedInFamily.get(id))
                                .filter(p => p !== undefined) as Array<{ x: number, y: number }>;

                            if (positions.length > 0) {
                                const avgX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
                                baseX = avgX - (children.length - 1) * HORIZONTAL_SPACING / 2;
                            }
                        }

                        // Position this group of children
                        let childX = Math.max(baseX, currentX);
                        children.forEach(child => {
                            if (processed.has(child.id)) return;

                            positionedInFamily.set(child.id, { x: childX, y: gen * VERTICAL_SPACING });
                            allPositioned.push({
                                ...child,
                                x: childX,
                                y: gen * VERTICAL_SPACING,
                                generation: gen,
                                familyGroupId: groupId
                            });
                            processed.add(child.id);
                            childX += HORIZONTAL_SPACING;
                        });

                        currentX = Math.max(currentX, childX);
                    });
                }

                maxWidthInFamily = Math.max(maxWidthInFamily, currentX - currentFamilyX);
            }

            currentFamilyX += maxWidthInFamily + FAMILY_GROUP_SPACING;
        });

        console.log('[TraditionalFamilyTree] Positioned', allPositioned.length, 'members');
        return allPositioned;
    }, [members, partnerships, parentChildRelations, findFamilyGroups, calculateGenerations]);

    // Initialize D3 tree with custom layout
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

        // Layout all members
        const positioned = layoutFamilies();

        console.log('[TraditionalFamilyTree] Positioned', positioned.length, 'members');

        // Draw partnership links (horizontal lines between spouses)
        const partnershipLinks = partnerships.flatMap(p => {
            const person1 = positioned.find(m => m.id === p.person1_id);
            const person2 = positioned.find(m => m.id === p.person2_id);
            if (person1 && person2 && person1.generation === person2.generation) {
                return [{
                    source: person1,
                    target: person2,
                    type: 'partnership'
                }];
            }
            return [];
        });

        g.selectAll('.partnership-link')
            .data(partnershipLinks)
            .enter()
            .append('line')
            .attr('class', 'partnership-link')
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y)
            .attr('stroke', '#f59e0b')
            .attr('stroke-width', 3)
            .attr('stroke-dasharray', '5,5');

        // Draw parent-child links with cleaner routing
        // Group children by their parent pairs
        const childrenByParentPair = new Map<string, { children: PositionedMember[], parents: PositionedMember[] }>();

        parentChildRelations.forEach(rel => {
            const parent = positioned.find(m => m.id === rel.parent_id);
            const child = positioned.find(m => m.id === rel.child_id);

            if (parent && child) {
                // Get all parents of this child
                const allParents = parentChildRelations
                    .filter(r => r.child_id === child.id)
                    .map(r => positioned.find(m => m.id === r.parent_id))
                    .filter(p => p !== undefined) as PositionedMember[];

                const parentKey = allParents.map(p => p.id).sort().join('-');

                if (!childrenByParentPair.has(parentKey)) {
                    childrenByParentPair.set(parentKey, { children: [], parents: allParents });
                }

                const group = childrenByParentPair.get(parentKey)!;
                if (!group.children.find(c => c.id === child.id)) {
                    group.children.push(child);
                }
            }
        });

        // Draw links for each parent-children group
        childrenByParentPair.forEach((group) => {
            if (group.children.length === 0 || group.parents.length === 0) return;

            // Calculate midpoint between parents
            const parentX = group.parents.reduce((sum, p) => sum + p.x, 0) / group.parents.length;
            const parentY = group.parents[0].y;

            // Calculate children span
            const childrenXs = group.children.map(c => c.x);
            const minChildX = Math.min(...childrenXs);
            const maxChildX = Math.max(...childrenXs);
            const childY = group.children[0].y;

            // Draw vertical line from parent down
            g.append('line')
                .attr('class', 'parent-child-link')
                .attr('x1', parentX)
                .attr('y1', parentY + 40)
                .attr('x2', parentX)
                .attr('y2', childY - 100)
                .attr('stroke', '#64748b')
                .attr('stroke-width', 2);

            // Draw horizontal line connecting all children
            if (group.children.length > 1) {
                g.append('line')
                    .attr('class', 'parent-child-link')
                    .attr('x1', minChildX)
                    .attr('y1', childY - 100)
                    .attr('x2', maxChildX)
                    .attr('y2', childY - 100)
                    .attr('stroke', '#64748b')
                    .attr('stroke-width', 2);
            }

            // Draw vertical lines to each child
            group.children.forEach(child => {
                g.append('line')
                    .attr('class', 'parent-child-link')
                    .attr('x1', child.x)
                    .attr('y1', childY - 100)
                    .attr('x2', child.x)
                    .attr('y2', childY - 40)
                    .attr('stroke', '#64748b')
                    .attr('stroke-width', 2);
            });
        });

        // Draw nodes
        const node = g.selectAll('.node')
            .data(positioned)
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.x},${d.y})`)
            .style('cursor', 'pointer')
            .on('click', (event, d) => {
                event.stopPropagation();
                setSelectedMember(d);
                setIsEditModalOpen(true);
            });

        // Node background card
        node.append('rect')
            .attr('x', -80)
            .attr('y', -40)
            .attr('width', 160)
            .attr('height', 80)
            .attr('rx', 8)
            .attr('fill', d => d.gender === 'female' ? '#fce7f3' : '#dbeafe')
            .attr('stroke', d => d.gender === 'female' ? '#ec4899' : '#3b82f6')
            .attr('stroke-width', 3);

        // Node text - name
        node.append('text')
            .attr('dy', -10)
            .attr('text-anchor', 'middle')
            .attr('fill', '#1e293b')
            .attr('font-weight', 'bold')
            .attr('font-size', '14px')
            .text(d => `${d.first_name} ${d.last_name || ''}`);

        // Node text - birth year
        node.append('text')
            .attr('dy', 10)
            .attr('text-anchor', 'middle')
            .attr('fill', '#64748b')
            .attr('font-size', '12px')
            .text(d => d.birth_date ? `📅 ${new Date(d.birth_date).getFullYear()}` : '');

        // Node text - location
        node.append('text')
            .attr('dy', 28)
            .attr('text-anchor', 'middle')
            .attr('fill', '#64748b')
            .attr('font-size', '11px')
            .text(d => {
                if (d.is_alive && d.current_residence) {
                    return `📍 ${d.current_residence}`;
                } else if (d.birth_place) {
                    return `🏙️ ${d.birth_place}`;
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
    }, [members, partnerships, parentChildRelations, loading, layoutFamilies]);

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
