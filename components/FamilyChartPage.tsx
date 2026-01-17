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
    // Create a map of member IDs to their data
    const memberMap = new Map<number, FamilyMember>();
    members.forEach(m => memberMap.set(m.id, m));

    // Build family-chart data structure
    // Format: { id, data: { "first name", "last name", gender, birthday, avatar }, rels: { father?, mother?, spouses?, children? } }
    const data = members.map(member => {
        // Find this person's parents
        const parentRelations = parentChild.filter(pc => pc.child_id === member.id);

        let father: string | undefined;
        let mother: string | undefined;
        const spouses: string[] = [];

        parentRelations.forEach(pr => {
            const parent = memberMap.get(pr.parent_id);
            if (parent) {
                if (parent.gender === 'female') {
                    mother = `person-${pr.parent_id}`;
                } else {
                    father = `person-${pr.parent_id}`;
                }
            }
        });

        // Find this person's spouse(s)
        const spouseRelations = partnerships.filter(
            p => p.person1_id === member.id || p.person2_id === member.id
        );
        spouseRelations.forEach(sr => {
            const spouseId = sr.person1_id === member.id ? sr.person2_id : sr.person1_id;
            spouses.push(`person-${spouseId}`);
        });

        // Find this person's children
        const childRelations = parentChild.filter(pc => pc.parent_id === member.id);
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

            cardHtml
                .setCardDisplay([
                    ['first name', 'last name'],
                    ['birthday']
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

    // Manual trigger only
    // useEffect(() => {
    //    if (!loading && allMembers.length > 0) {
    //        const timer = setTimeout(renderChart, 100);
    //        return () => clearTimeout(timer);
    //    }
    // }, [loading, allMembers, renderChart]);

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
