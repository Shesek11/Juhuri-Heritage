import apiService from './apiService';

export interface FamilyMember {
    id: number;
    user_id?: number;
    first_name: string;
    last_name: string;
    maiden_name?: string;
    gender: 'male' | 'female' | 'other';
    birth_date?: string;
    death_date?: string;
    birth_place?: string;
    death_place?: string;
    biography?: string;
    photo_url?: string;
    father_id?: number;
    mother_id?: number;
    spouse_id?: number;
    is_alive: boolean;

    // Relationships populated by API
    father?: FamilyMember;
    mother?: FamilyMember;
    spouse?: FamilyMember;
    children?: FamilyMember[];
}

export interface CreateMemberInput {
    first_name: string;
    last_name: string;
    maiden_name?: string;
    gender: 'male' | 'female' | 'other';
    birth_date?: string;
    death_date?: string;
    birth_place?: string;
    death_place?: string;
    biography?: string;
    photo_url?: string;
    father_id?: number;
    mother_id?: number;
    spouse_id?: number;
    is_alive: boolean;
}

export const familyService = {
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

    // Get raw data for tree construction
    getTreeData: (rootId?: number) => {
        return apiService.get<Partial<FamilyMember>[]>(`/family/tree/${rootId || 0}`);
    }
};
