import apiService from './apiService';

// =====================================================
// Types
// =====================================================

export interface FamilyMember {
    id: number;
    user_id?: number;

    // Name fields
    first_name: string;
    last_name: string;
    maiden_name?: string;
    nickname?: string;
    previous_name?: string;
    title?: string;

    gender: 'male' | 'female' | 'other';

    // Dates & Places
    birth_date?: string;
    death_date?: string;
    birth_place?: string;
    death_place?: string;

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
    gender: 'male' | 'female' | 'other';
    birth_date?: string;
    death_date?: string;
    birth_place?: string;
    death_place?: string;
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
        return apiService.get<FamilyMember[]>(`/family/tree/${rootId || 0}`);
    }
};
