import React, { useRef, useEffect, useState, useCallback } from 'react';
import f3 from 'family-chart';
// CSS imported via CDN in index.html to avoid Vite resolution issues
import { familyService, FamilyMember } from '../services/familyService';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Loader2, Users } from 'lucide-react';
import { AddMemberModal } from './family/AddMemberModal';

// Adapter: Convert our database format to family-chart format
function convertToFamilyChartData(
    members: FamilyMember[],
    parentChild: Array<{ parent_id: number; child_id: number; relationship_type: string }>,
    partnerships: Array<{ person1_id: number; person2_id: number; status: string }>
) {
    // Create a map of member IDs to their data for easy lookup
    const memberMap = new Map<number, FamilyMember>();
    members.forEach(m => memberMap.set(m.id, m));

    // --- DATA SANITIZATION START ---

    // 1. Fix Circular Parent-Child Relationships (A is parent of B, AND B is parent of A)
    // We will break the cycle by removing the relationship where the "parent" is younger (if dates exist) or arbitrary.
    const validParentChild = parentChild.filter(pc => {
        // Check if the reverse relationship exists
        const reverseExists = parentChild.some(
            rpc => rpc.parent_id === pc.child_id && rpc.child_id === pc.parent_id
        );

        if (reverseExists) {
            // Cycle detected! 
            // Strategy: Keep only if parent_id < child_id (arbitrary stable sort to break cycle)
            // Unless we have birth dates... but let's keep it simple and stable.
            // This ensures we keep A->B and remove B->A, but not remove both.
            if (pc.parent_id > pc.child_id) {
                console.warn(`[FamilyChart] Broken circular parent-child cycle: Removing ${pc.parent_id}->${pc.child_id}`);
                return false;
            }
        }
        return true;
    });

    // 2. Fix Self-References
    const sanitizedParentChild = validParentChild.filter(pc => pc.parent_id !== pc.child_id);
    const sanitizedPartnerships = partnerships.filter(p => p.person1_id !== p.person2_id);

    // --- DATA SANITIZATION END ---

    // Build family-chart data structure
    const data = members.map(member => {
        // Find this person's parents (using sanitized list)
        const parentRelations = sanitizedParentChild.filter(pc => pc.child_id === member.id);

        let father: string | undefined;
        let mother: string | undefined;
        let spouses: string[] = [];

        parentRelations.forEach(pr => {
            const parent = memberMap.get(pr.parent_id);
            if (parent) {
                // Determine gender-based parent role
                // Note: family-chart expects specific 'father'/'mother' keys or just generated IDs.
                // We assign based on gender if available, otherwise guess.
                if (parent.gender === 'female') {
                    if (!mother) mother = `person-${pr.parent_id}`;
                } else {
                    if (!father) father = `person-${pr.parent_id}`;
                }
            }
        });

        // Find this person's spouse(s)
        const spouseRelations = sanitizedPartnerships.filter(
            p => p.person1_id === member.id || p.person2_id === member.id
        );
        spouseRelations.forEach(sr => {
            const spouseId = sr.person1_id === member.id ? sr.person2_id : sr.person1_id;
            spouses.push(`person-${spouseId}`);
        });

        // Deduplicate spouses
        spouses = [...new Set(spouses)];

        // Validate spouses: Filter out spouses that are also parents or children (Graph logic error)
        // Although technically incorrect, some dirty data might have this. 
        // We won't filter strict incest here unless it causes visual bugs, 
        // but removing duplicate IDs from spouse list is critical.

        // Find this person's children
        const childRelations = sanitizedParentChild.filter(pc => pc.parent_id === member.id);
        const children = childRelations.map(cr => `person-${cr.child_id}`);

        return {
            id: `person-${member.id}`,
            data: {
                'first name': member.first_name,
                'last name': member.last_name || '',
                birthday: member.birth_date || '',
                avatar: member.photo_url || '',
                gender: (member.gender === 'female' ? 'F' : 'M') as 'F' | 'M'
            },
            rels: {
                ...(father ? { father } : {}),
                ...(mother ? { mother } : {}),
                ...(spouses.length > 0 ? { spouses } : {}),
                ...(children.length > 0 ? { children } : {})
            }
        };
    });

    return data;
}

export function FamilyChartPage() {
    const { user } = useAuth();
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);

    const [loading, setLoading] = useState(true);
    const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);
    const [parentChild, setParentChild] = useState<any[]>([]);
    const [partnerships, setPartnerships] = useState<any[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Load data only - separate from chart creation
    const loadTree = useCallback(async () => {
        try {
            setLoading(true);
            const data = await familyService.getTreeData();
            setAllMembers(data.members || []);
            setParentChild(data.parentChild || []);
            setPartnerships(data.partnerships || []);
            console.log('[FamilyChart] Data loaded:', data.members?.length || 0, 'members');
        } catch (error) {
            console.error('Failed to load tree:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial data load
    useEffect(() => {
        loadTree();
    }, [loadTree]);

    // Create chart AFTER loading is false and container exists
    const renderChart = useCallback(() => {
        // Only run when not loading and we have members
        if (loading || allMembers.length === 0) {
            console.log('[FamilyChart] Chart creation skipped - loading:', loading, 'members:', allMembers.length);
            return;
        }

        if (!containerRef.current) {
            console.error('[FamilyChart] Container ref is null');
            return;
        }

        console.log('[FamilyChart] Container ref exists:', containerRef.current);

        // Convert to family-chart format
        const chartData = convertToFamilyChartData(allMembers, parentChild, partnerships);
        console.log('[FamilyChart] Data converted:', chartData);

        // Clear previous chart
        containerRef.current.innerHTML = '';

        try {
            // Create chart using the library API
            console.log('[FamilyChart] Calling f3.createChart...');
            const chart = f3.createChart(containerRef.current, chartData as any);
            console.log('[FamilyChart] Chart created:', chart);

            // Configure card display
            console.log('[FamilyChart] Calling setCardHtml...');
            const cardHtml = (chart as any).setCardHtml();
            console.log('[FamilyChart] CardHtml instance:', cardHtml);

            // Set explicit card dimensions
            (cardHtml as any).card_dim = { w: 200, h: 220, text_x: 0, text_y: 0, img_w: 0, img_h: 0, img_x: 0, img_y: 0 };

            cardHtml
                .setCardDisplay([
                    (d: any) => {
                        const data = d.data;
                        const color = data.gender === 'F' ? '#ec4899' : '#3b82f6'; // Pink-500 : Blue-500
                        const bgColor = data.gender === 'F' ? '#fdf2f8' : '#eff6ff'; // Pink-50 : Blue-50
                        const initials = (data['first name']?.[0] || '?') + (data['last name']?.[0] || '');

                        return `
                            <div style="
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: flex-start;
                                width: 180px;
                                height: 200px;
                                background: white;
                                border: 2px solid ${color};
                                border-radius: 12px;
                                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                                padding: 16px;
                                font-family: sans-serif;
                                box-sizing: border-box;
                            ">
                                <div style="margin-bottom: 12px;">
                                    ${data.avatar
                                ? `<img src="${data.avatar}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid ${color}; background: white;" />`
                                : `<div style="width: 80px; height: 80px; border-radius: 50%; background: ${bgColor}; color: ${color}; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; border: 2px solid ${color};">${initials}</div>`
                            }
                                </div>
                                <div style="text-align: center; margin-bottom: 8px; width: 100%;">
                                    <div style="font-weight: 700; font-size: 16px; color: #1e293b; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                        ${data['first name']}
                                    </div>
                                    <div style="font-weight: 400; font-size: 14px; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                        ${data['last name'] || ''}
                                    </div>
                                </div>
                                ${data.birthday
                                ? `<div style="font-size: 12px; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 10px;">${data.birthday.split('-')[0]}</div>`
                                : ''
                            }
                            </div>
                        `;
                    }
                ])
                .setCardImageField('avatar');

            // Render the tree
            console.log('[FamilyChart] Calling updateTree...');
            chart.updateTree({ initial: true });
            console.log('[FamilyChart] updateTree done. Container innerHTML length:', containerRef.current.innerHTML.length);

            // Store ref for later
            chartRef.current = chart;
        } catch (chartError) {
            console.error('[FamilyChart] Error creating chart:', chartError);
        }
    }, [loading, allMembers, parentChild, partnerships]);

    // Auto-render enabled again with safe data
    useEffect(() => {
        if (!loading && allMembers.length > 0) {
            const timer = setTimeout(renderChart, 100);
            return () => clearTimeout(timer);
        }
    }, [loading, allMembers, renderChart]);

    const exportData = () => {
        const chartData = convertToFamilyChartData(allMembers, parentChild, partnerships);
        console.log('EXPORTED_DATA:', JSON.stringify(chartData, null, 2));
        alert('Data logged to console (search for EXPORTED_DATA)');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col" dir="rtl">
            {/* Header */}
            <div className="bg-slate-800/80 backdrop-blur border-b border-slate-700 px-4 py-3 flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-white">🌳 אילן יוחסין</h1>
                    <span className="text-slate-400 text-sm">{allMembers.length} בני משפחה</span>
                    <span className="bg-purple-600/30 text-purple-300 px-2 py-1 rounded text-xs">Family Chart</span>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={renderChart}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium"
                    >
                        Render Chart
                    </button>
                    <button
                        onClick={exportData}
                        className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-sm font-medium"
                    >
                        Export Data
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        הוסף בן משפחה
                    </button>
                </div>
            </div>

            {/* Chart Container */}
            <div className="flex-1 relative">
                <style>{`
                    /* Hide default SVG card elements that cause "ghosting" behind HTML cards */
                    /* We target all direct children of .card that are NOT the foreignObject (which holds our HTML) */
                    #FamilyChart svg .card rect { fill: transparent !important; stroke: none !important; filter: none !important; }
                    #FamilyChart svg .card image { display: none !important; }
                    #FamilyChart svg .card use { display: none !important; }
                    
                    /* Ensure connections are styled nicely */
                    #FamilyChart svg .link { stroke: #94a3b8 !important; stroke-width: 2px !important; }
                    
                    /* Fix tooltip z-index if needed */
                    .f3-card-html { overflow: visible !important; }
                `}</style>
                {allMembers.length > 0 ? (
                    <div
                        ref={containerRef}
                        id="FamilyChart"
                        className="w-full h-full"
                        style={{ minHeight: '500px' }}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <Users className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-lg mb-4">אין בני משפחה להצגה</p>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            הוסף את בן המשפחה הראשון
                        </button>
                    </div>
                )}
            </div>

            {/* Modals */}
            {isAddModalOpen && (
                <AddMemberModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={() => {
                        setIsAddModalOpen(false);
                        loadTree();
                    }}
                />
            )}
        </div>
    );
}

export default FamilyChartPage;
