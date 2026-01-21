/**
 * Balkan FamilyTree Data Service
 * Transforms database format to Balkan FamilyTree JS format
 */

export interface BalkanNode {
    id: number;
    pids?: number[];      // Partner IDs
    fid?: number;         // Father ID (parent_id where parent.gender = male)
    mid?: number;         // Mother ID (parent_id where parent.gender = female)
    name: string;
    img?: string;
    gender: 'male' | 'female';
    title?: string;       // Maiden name or other title
    birthDate?: string;
    deathDate?: string;
    isAlive?: boolean;
}

export interface DBMember {
    id: number;
    first_name: string;
    last_name: string;
    maiden_name?: string;
    gender: 'male' | 'female' | 'other';
    photo_url?: string;
    birth_date?: string;
    death_date?: string;
    is_alive: boolean;
}

export interface DBParentChild {
    parent_id: number;
    child_id: number;
    relationship_type: string;
}

export interface DBPartnership {
    person1_id: number;
    person2_id: number;
    status: string;
}

export interface TreeData {
    members: DBMember[];
    parentChild: DBParentChild[];
    partnerships: DBPartnership[];
}

/**
 * Transform DB tree data to Balkan FamilyTree format
 */
export function transformToBalkanFormat(data: TreeData): BalkanNode[] {
    const { members, parentChild, partnerships } = data;

    // Create member lookup map
    const memberMap = new Map<number, DBMember>();
    members.forEach(m => memberMap.set(m.id, m));

    // Create parent lookup for each child
    const parentsByChild = new Map<number, { fid?: number; mid?: number }>();
    parentChild.forEach(pc => {
        const parent = memberMap.get(pc.parent_id);
        if (!parent) return;

        const existing = parentsByChild.get(pc.child_id) || {};
        if (parent.gender === 'male') {
            existing.fid = pc.parent_id;
        } else {
            existing.mid = pc.parent_id;
        }
        parentsByChild.set(pc.child_id, existing);
    });

    // Create partner lookup
    const partnersByPerson = new Map<number, number[]>();
    partnerships.forEach(p => {
        // Add partner to person1
        const partners1 = partnersByPerson.get(p.person1_id) || [];
        if (!partners1.includes(p.person2_id)) partners1.push(p.person2_id);
        partnersByPerson.set(p.person1_id, partners1);

        // Add partner to person2
        const partners2 = partnersByPerson.get(p.person2_id) || [];
        if (!partners2.includes(p.person1_id)) partners2.push(p.person1_id);
        partnersByPerson.set(p.person2_id, partners2);
    });

    // Transform each member
    return members.map(member => {
        const parents = parentsByChild.get(member.id);
        const partners = partnersByPerson.get(member.id);

        const fullName = member.maiden_name
            ? `${member.first_name} ${member.last_name} (לבית ${member.maiden_name})`
            : `${member.first_name} ${member.last_name}`;

        const node: BalkanNode = {
            id: member.id,
            name: fullName,
            gender: member.gender === 'other' ? 'male' : member.gender,
            img: member.photo_url || undefined,
            isAlive: member.is_alive,
        };

        // Add parents
        if (parents?.fid) node.fid = parents.fid;
        if (parents?.mid) node.mid = parents.mid;

        // TEMPORARILY DISABLED: pids causing stack overflow in Balkan library
        // Need to investigate correct format for partner relationships
        // if (partners && partners.length > 0) {
        //     node.pids = partners;
        // }

        // Add dates as title for display
        if (member.birth_date || member.death_date) {
            const birth = member.birth_date ? new Date(member.birth_date).getFullYear() : '?';
            const death = member.death_date ? new Date(member.death_date).getFullYear() : (member.is_alive ? '' : '?');
            node.title = death ? `${birth} - ${death}` : `נ. ${birth}`;
        }

        return node;
    });
}

/**
 * Fetch tree data from API and transform to Balkan format
 */
export async function fetchBalkanTreeData(): Promise<BalkanNode[]> {
    const response = await fetch('/api/family/tree/0');
    if (!response.ok) {
        throw new Error('Failed to fetch tree data');
    }
    const data: TreeData = await response.json();
    return transformToBalkanFormat(data);
}
