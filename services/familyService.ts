import apiService from './apiService';

// =====================================================
// Types
// =====================================================

export interface FamilyMember {
    id: number;
    user_id?: number;

    // Name fields (Hebrew)
    first_name: string;
    last_name: string;
    maiden_name?: string;
    nickname?: string;
    previous_name?: string;
    title?: string;

    // Name fields (Russian)
    first_name_ru?: string;
    last_name_ru?: string;
    maiden_name_ru?: string;

    gender: 'male' | 'female' | 'other';

    // Dates & Places (legacy combined fields)
    birth_date?: string;
    death_date?: string;
    birth_place?: string;
    death_place?: string;
    current_residence?: string;

    // Places (split: city + country)
    birth_city?: string;
    birth_country?: string;
    death_city?: string;
    death_country?: string;
    residence_city?: string;
    residence_country?: string;

    // Places (Russian)
    birth_city_ru?: string;
    birth_country_ru?: string;
    death_city_ru?: string;
    death_country_ru?: string;
    residence_city_ru?: string;
    residence_country_ru?: string;

    biography?: string;
    photo_url?: string;

    is_alive: boolean;

    // Legacy fields (deprecated, use relationships)
    father_id?: number;
    mother_id?: number;
    spouse_id?: number;

    // Populated relationships
    parents?: ParentRelationship[];
    partnerships?: Partnership[];
    children?: ChildRelationship[];
}

export type ParentChildType = 'biological' | 'adopted' | 'foster' | 'step';
export type PartnershipStatus = 'married' | 'divorced' | 'widowed' | 'common_law' | 'separated' | 'engaged';

export interface MergeSuggestion {
    id: number;
    member1_id: number;
    member2_id: number;
    member1_first: string;
    member1_last: string;
    member1_birth?: string;
    member1_photo?: string;
    member1_owner?: number;
    member2_first: string;
    member2_last: string;
    member2_birth?: string;
    member2_photo?: string;
    member2_owner?: number;
    suggested_by?: number;
    suggested_by_name?: string;
    suggested_at: string;
    confidence_score: number;
    reason?: string;
    status: 'pending' | 'approved' | 'rejected';
}

export interface LinkRequest {
    id: number;
    requester_id: number;
    requester_name: string;
    source_member_id: number;
    source_first: string;
    source_last: string;
    target_member_id: number;
    target_first: string;
    target_last: string;
    target_owner?: number;
    relationship_type: 'same_person' | 'parent' | 'child' | 'spouse';
    message?: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}

export interface ParentRelationship {
    id: number;
    parent_id: number;
    child_id: number;
    relationship_type: ParentChildType;
    parent?: FamilyMember;
    notes?: string;
}

export interface ChildRelationship {
    id: number;
    parent_id: number;
    child_id: number;
    relationship_type: ParentChildType;
    child?: FamilyMember;
    notes?: string;
}

export interface Partnership {
    id: number;
    person1_id: number;
    person2_id: number;
    status: PartnershipStatus;
    start_date?: string;
    end_date?: string;
    marriage_place?: string;
    notes?: string;
    partner?: FamilyMember; // The other person in the relationship
}

export interface CreateMemberInput {
    first_name: string;
    last_name: string;
    maiden_name?: string;
    nickname?: string;
    previous_name?: string;
    title?: string;
    first_name_ru?: string;
    last_name_ru?: string;
    maiden_name_ru?: string;
    gender: 'male' | 'female' | 'other';
    birth_date?: string;
    death_date?: string;
    birth_place?: string;
    death_place?: string;
    current_residence?: string;
    birth_city?: string;
    birth_country?: string;
    death_city?: string;
    death_country?: string;
    residence_city?: string;
    residence_country?: string;
    birth_city_ru?: string;
    birth_country_ru?: string;
    death_city_ru?: string;
    death_country_ru?: string;
    residence_city_ru?: string;
    residence_country_ru?: string;
    biography?: string;
    photo_url?: string;
    is_alive: boolean;
}

export interface CreateParentChildInput {
    parent_id: number;
    child_id: number;
    relationship_type: ParentChildType;
    notes?: string;
}

export interface CreatePartnershipInput {
    person1_id: number;
    person2_id: number;
    status: PartnershipStatus;
    start_date?: string;
    end_date?: string;
    marriage_place?: string;
    notes?: string;
}

// =====================================================
// Service
// =====================================================

export const familyService = {
    // Member CRUD
    getAllMembers: (search?: string, aliveOnly?: boolean) => {
        const query = new URLSearchParams();
        if (search) query.append('search', search);
        if (aliveOnly) query.append('alive_only', 'true');
        return apiService.get<FamilyMember[]>(`/family/members?${query.toString()}`);
    },

    getMemberDetails: (id: number) => {
        return apiService.get<FamilyMember>(`/family/members/${id}`);
    },

    createMember: (data: CreateMemberInput) => {
        return apiService.post<{ success: true; id: number }>('/family/members', data);
    },

    updateMember: (id: number, data: Partial<CreateMemberInput>) => {
        return apiService.put(`/family/members/${id}`, data);
    },

    deleteMember: (id: number) => {
        return apiService.delete(`/family/members/${id}`);
    },

    // Parent-Child Relationships
    addParentChild: (data: CreateParentChildInput) => {
        return apiService.post<{ success: true; id: number }>('/family/relationships/parent-child', data);
    },

    removeParentChild: (id: number) => {
        return apiService.delete(`/family/relationships/parent-child/${id}`);
    },

    getParents: (memberId: number) => {
        return apiService.get<ParentRelationship[]>(`/family/members/${memberId}/parents`);
    },

    getChildren: (memberId: number) => {
        return apiService.get<ChildRelationship[]>(`/family/members/${memberId}/children`);
    },

    // Partnerships
    addPartnership: (data: CreatePartnershipInput) => {
        return apiService.post<{ success: true; id: number }>('/family/relationships/partnership', data);
    },

    updatePartnership: (id: number, data: Partial<CreatePartnershipInput>) => {
        return apiService.put(`/family/relationships/partnership/${id}`, data);
    },

    removePartnership: (id: number) => {
        return apiService.delete(`/family/relationships/partnership/${id}`);
    },

    getPartnerships: (memberId: number) => {
        return apiService.get<Partnership[]>(`/family/members/${memberId}/partnerships`);
    },

    // Siblings (calculated)
    getSiblings: (memberId: number) => {
        return apiService.get<{
            full: FamilyMember[];
            half: FamilyMember[];
            step: FamilyMember[];
        }>(`/family/members/${memberId}/siblings`);
    },

    // Get raw data for tree construction
    getTreeData: (rootId?: number) => {
        return apiService.get<{
            members: FamilyMember[];
            parentChild: { parent_id: number; child_id: number; relationship_type: string }[];
            partnerships: { person1_id: number; person2_id: number; status: string }[];
        }>(`/family/tree/${rootId || 0}`);
    },

    // =====================================================
    // Community Features
    // =====================================================

    // Search with Soundex (phonetic)
    searchMembers: (query: string, limit?: number) => {
        return apiService.get<FamilyMember[]>(`/family/community/search?q=${encodeURIComponent(query)}&limit=${limit || 20}`);
    },

    // Find potential duplicates
    findDuplicates: (memberId: number) => {
        return apiService.get<(FamilyMember & { similarity_score: number })[]>(`/family/community/duplicates/${memberId}`);
    },

    // Merge Suggestions
    getMergeSuggestions: () => {
        return apiService.get<MergeSuggestion[]>('/family/community/suggestions');
    },

    createMergeSuggestion: (member1Id: number, member2Id: number, reason?: string) => {
        return apiService.post<{ success: true; id: number }>('/family/community/suggestions', {
            member1_id: member1Id,
            member2_id: member2Id,
            reason
        });
    },

    respondToMergeSuggestion: (suggestionId: number, status: 'approved' | 'rejected', keepMemberId?: number) => {
        return apiService.put(`/family/community/suggestions/${suggestionId}`, { status, keepMemberId });
    },

    // Link Requests
    getLinkRequests: () => {
        return apiService.get<LinkRequest[]>('/family/community/link-requests');
    },

    createLinkRequest: (sourceMemberId: number, targetMemberId: number, relationshipType: string, message?: string) => {
        return apiService.post<{ success: true; id: number }>('/family/community/link-requests', {
            source_member_id: sourceMemberId,
            target_member_id: targetMemberId,
            relationship_type: relationshipType,
            message
        });
    },

    respondToLinkRequest: (requestId: number, status: 'approved' | 'rejected') => {
        return apiService.put(`/family/community/link-requests/${requestId}`, { status });
    },

    // =====================================================
    // GEDCOM Tools
    // =====================================================

    importGedcom: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        // Use fetch directly because apiService might set Content-Type to json
        const response = await fetch(`${apiService.baseURL}/family/gedcom/import`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to import GEDCOM');
        }

        return response.json();
    },

    // AI Transliteration (Hebrew ↔ Russian)
    transliterateNames: (fields: Record<string, string>, direction: 'he-to-ru' | 'ru-to-he') => {
        return apiService.post<Record<string, string>>('/gemini/transliterate-names', { fields, direction });
    },

    exportGedcom: async () => {
        const response = await fetch(`${apiService.baseURL}/family/gedcom/export`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to export GEDCOM');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `family_tree_${new Date().toISOString().split('T')[0]}.ged`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
};
