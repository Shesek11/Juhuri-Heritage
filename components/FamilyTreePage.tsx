/**
 * Family Tree Page - Using Balkan FamilyTreeJS
 * Clean, professional family tree visualization
 */

import React, { useState } from 'react';
import { Plus, Download, Upload, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import BalkanFamilyTree from './family/BalkanFamilyTree';
import { AddMemberModal } from './family/AddMemberModal';
import { BalkanNode } from '../services/balkanService';

const FamilyTreePage: React.FC = () => {
    const { user } = useAuth();
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState<BalkanNode | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [key, setKey] = useState(0); // For forcing refresh

    const handleNodeClick = (node: BalkanNode) => {
        setSelectedMember(node);
        console.log('Selected member:', node);
    };

    const handleMemberAdded = () => {
        setShowAddModal(false);
        // Force tree refresh
        setKey(k => k + 1);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-slate-800/80 backdrop-blur border-b border-slate-700">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                        {/* Title */}
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🌳</span>
                            <h1 className="text-xl font-bold text-white">אילן יוחסין</h1>
                        </div>

                        {/* Search */}
                        <div className="flex-1 max-w-md">
                            <div className="relative">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="חפש בן משפחה..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg py-2 pr-10 pl-4 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">הוסף בן משפחה</span>
                            </button>

                            <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition" title="ייצא">
                                <Download className="w-5 h-5" />
                            </button>

                            <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition" title="ייבא">
                                <Upload className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tree Container */}
            <div className="p-4">
                <BalkanFamilyTree
                    key={key}
                    onNodeClick={handleNodeClick}
                    onAddMember={() => setShowAddModal(true)}
                />
            </div>

            {/* Selected Member Panel */}
            {selectedMember && (
                <div className="fixed bottom-4 right-4 z-30 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-4 w-72">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-white">{selectedMember.name}</h3>
                        <button
                            onClick={() => setSelectedMember(null)}
                            className="text-slate-400 hover:text-white"
                        >
                            ✕
                        </button>
                    </div>
                    {selectedMember.title && (
                        <p className="text-sm text-slate-400 mb-3">{selectedMember.title}</p>
                    )}
                    <div className="flex gap-2">
                        <button className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm transition">
                            ערוך
                        </button>
                        <button className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition">
                            הוסף קרוב
                        </button>
                    </div>
                </div>
            )}

            {/* Add Member Modal */}
            {showAddModal && (
                <AddMemberModal
                    onClose={() => setShowAddModal(false)}
                    onSave={handleMemberAdded}
                />
            )}
        </div>
    );
};

export default FamilyTreePage;
