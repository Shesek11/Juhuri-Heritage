/**
 * GEDCOM Import/Export Service
 * Handles importing and exporting family tree data in GEDCOM format
 */

const { readGedcom } = require('read-gedcom');
const pool = require('../config/db');

/**
 * Parse a GEDCOM date string to ISO date
 * GEDCOM dates can be: "1 JAN 1990", "JAN 1990", "1990", "ABT 1990", etc.
 */
const parseGedcomDate = (dateStr) => {
    if (!dateStr) return null;

    // Remove modifiers like ABT (about), BEF (before), AFT (after), etc.
    const cleaned = dateStr.replace(/^(ABT|BEF|AFT|EST|CAL|FROM|TO|BET|AND)\s*/gi, '').trim();

    const months = {
        'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
        'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
        'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
    };

    // Try to parse different formats
    // Format: "1 JAN 1990" or "01 JAN 1990"
    const fullMatch = cleaned.match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})$/);
    if (fullMatch) {
        const [, day, month, year] = fullMatch;
        const monthNum = months[month.toUpperCase()];
        if (monthNum) {
            return `${year}-${monthNum}-${day.padStart(2, '0')}`;
        }
    }

    // Format: "JAN 1990"
    const monthYearMatch = cleaned.match(/^(\w{3})\s+(\d{4})$/);
    if (monthYearMatch) {
        const [, month, year] = monthYearMatch;
        const monthNum = months[month.toUpperCase()];
        if (monthNum) {
            return `${year}-${monthNum}-01`;
        }
    }

    // Format: "1990"
    const yearMatch = cleaned.match(/^(\d{4})$/);
    if (yearMatch) {
        return `${yearMatch[1]}-01-01`;
    }

    return null;
};

/**
 * Format a date for GEDCOM export
 */
const formatGedcomDate = (isoDate) => {
    if (!isoDate) return null;

    const date = new Date(isoDate);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
};

/**
 * Import a GEDCOM file into the database
 */
const importGedcom = async (fileBuffer, userId) => {
    const results = {
        individuals: 0,
        families: 0,
        skipped: 0,
        errors: [],
        mergeSuggestions: 0
    };

    const idMap = new Map(); // GEDCOM ID -> DB ID

    try {
        const gedcom = readGedcom(fileBuffer);

        // Step 1: Import all individuals
        const individuals = gedcom.getIndividualRecords();
        console.log(`Found ${individuals.length} individuals in GEDCOM`);

        for (const indi of individuals) {
            try {
                const pointer = indi.pointer;

                // Get name parts
                const nameRecord = indi.getName();
                let firstName = '';
                let lastName = '';
                let maidenName = null;

                if (nameRecord) {
                    const nameValue = nameRecord.valueAsName();
                    if (nameValue) {
                        firstName = nameValue.given || '';
                        lastName = nameValue.surname || '';
                        maidenName = nameValue.marriedSurname || null;
                    }
                }

                // Get gender
                const sexRecord = indi.getSex();
                let gender = 'other';
                if (sexRecord) {
                    const sexValue = sexRecord.value;
                    if (sexValue === 'M') gender = 'male';
                    else if (sexValue === 'F') gender = 'female';
                }

                // Get birth info
                const birthRecord = indi.getBirth();
                let birthDate = null;
                let birthPlace = null;
                if (birthRecord) {
                    const birthDateRecord = birthRecord.getDate();
                    if (birthDateRecord) birthDate = parseGedcomDate(birthDateRecord.value);

                    const birthPlaceRecord = birthRecord.getPlace();
                    if (birthPlaceRecord) birthPlace = birthPlaceRecord.value;
                }

                // Get death info
                const deathRecord = indi.getDeath();
                let deathDate = null;
                let deathPlace = null;
                let isAlive = true;
                if (deathRecord) {
                    isAlive = false;
                    const deathDateRecord = deathRecord.getDate();
                    if (deathDateRecord) deathDate = parseGedcomDate(deathDateRecord.value);

                    const deathPlaceRecord = deathRecord.getPlace();
                    if (deathPlaceRecord) deathPlace = deathPlaceRecord.value;
                }

                // Check if this person already exists (by external_id or similar name/birth)
                const [existing] = await pool.query(`
                    SELECT id FROM family_members 
                    WHERE external_id = ? AND external_source = 'gedcom'
                `, [pointer]);

                if (existing.length > 0) {
                    // Already imported, just map the ID
                    idMap.set(pointer, existing[0].id);
                    results.skipped++;
                    continue;
                }

                // Check for potential duplicates to suggest merge
                const [duplicates] = await pool.query(`
                    SELECT id, first_name, last_name, birth_date
                    FROM family_members
                    WHERE merged_into IS NULL
                      AND SOUNDEX(last_name) = SOUNDEX(?)
                      AND SOUNDEX(first_name) = SOUNDEX(?)
                    LIMIT 5
                `, [lastName, firstName]);

                // Insert the new member
                const memberData = {
                    first_name: firstName,
                    last_name: lastName,
                    maiden_name: maidenName,
                    gender,
                    birth_date: birthDate,
                    death_date: deathDate,
                    birth_place: birthPlace,
                    death_place: deathPlace,
                    is_alive: isAlive,
                    external_id: pointer,
                    external_source: 'gedcom',
                    user_id: userId
                };

                const [insertResult] = await pool.query('INSERT INTO family_members SET ?', memberData);
                const newMemberId = insertResult.insertId;
                idMap.set(pointer, newMemberId);
                results.individuals++;

                // Create merge suggestions for potential duplicates
                for (const dup of duplicates) {
                    // Calculate confidence based on similarity
                    let confidence = 0.5; // Base confidence
                    if (birthDate && dup.birth_date) {
                        const y1 = new Date(birthDate).getFullYear();
                        const y2 = new Date(dup.birth_date).getFullYear();
                        if (y1 === y2) confidence += 0.3;
                    }
                    if (lastName.toLowerCase() === dup.last_name?.toLowerCase()) confidence += 0.1;
                    if (firstName.toLowerCase() === dup.first_name?.toLowerCase()) confidence += 0.1;

                    await pool.query(`
                        INSERT INTO family_merge_suggestions 
                        (member1_id, member2_id, suggested_by, confidence_score, reason)
                        VALUES (?, ?, ?, ?, ?)
                    `, [newMemberId, dup.id, null, Math.min(confidence, 0.99), 'זוהה בייבוא GEDCOM']);
                    results.mergeSuggestions++;
                }

                // Log creation
                await pool.query(`
                    INSERT INTO family_member_history 
                    (member_id, changed_by, change_type, new_value)
                    VALUES (?, ?, 'create', ?)
                `, [newMemberId, userId, 'יובא מקובץ GEDCOM']);

            } catch (err) {
                results.errors.push({
                    type: 'individual',
                    id: indi.pointer,
                    error: err.message
                });
            }
        }

        // Step 2: Import family relationships
        const families = gedcom.getFamilyRecords();
        console.log(`Found ${families.length} families in GEDCOM`);

        for (const fam of families) {
            try {
                // Get husband and wife
                const husbandRef = fam.getHusband();
                const wifeRef = fam.getWife();

                const husbandId = husbandRef ? idMap.get(husbandRef.value?.replace(/@/g, '')) : null;
                const wifeId = wifeRef ? idMap.get(wifeRef.value?.replace(/@/g, '')) : null;

                // Create partnership
                if (husbandId && wifeId) {
                    // Check if partnership already exists
                    const [existingPartnership] = await pool.query(`
                        SELECT id FROM family_partnerships 
                        WHERE (person1_id = ? AND person2_id = ?) OR (person1_id = ? AND person2_id = ?)
                    `, [husbandId, wifeId, wifeId, husbandId]);

                    if (existingPartnership.length === 0) {
                        // Determine status from events
                        let status = 'married';
                        const divorceRecord = fam.getDivorce?.();
                        if (divorceRecord) status = 'divorced';

                        // Get marriage date
                        let startDate = null;
                        const marriageRecord = fam.getMarriage?.();
                        if (marriageRecord) {
                            const marriageDateRecord = marriageRecord.getDate?.();
                            if (marriageDateRecord) startDate = parseGedcomDate(marriageDateRecord.value);
                        }

                        await pool.query(`
                            INSERT INTO family_partnerships (person1_id, person2_id, status, start_date)
                            VALUES (?, ?, ?, ?)
                        `, [Math.min(husbandId, wifeId), Math.max(husbandId, wifeId), status, startDate]);
                    }
                }

                // Create parent-child relationships
                const children = fam.getChild?.() || [];
                for (const childRef of children) {
                    const childId = idMap.get(childRef.value?.replace(/@/g, ''));
                    if (!childId) continue;

                    // Link to father
                    if (husbandId) {
                        const [existingPC] = await pool.query(
                            'SELECT id FROM family_parent_child WHERE parent_id = ? AND child_id = ?',
                            [husbandId, childId]
                        );
                        if (existingPC.length === 0) {
                            await pool.query(
                                'INSERT INTO family_parent_child (parent_id, child_id, relationship_type) VALUES (?, ?, ?)',
                                [husbandId, childId, 'biological']
                            );
                        }
                    }

                    // Link to mother
                    if (wifeId) {
                        const [existingPC] = await pool.query(
                            'SELECT id FROM family_parent_child WHERE parent_id = ? AND child_id = ?',
                            [wifeId, childId]
                        );
                        if (existingPC.length === 0) {
                            await pool.query(
                                'INSERT INTO family_parent_child (parent_id, child_id, relationship_type) VALUES (?, ?, ?)',
                                [wifeId, childId, 'biological']
                            );
                        }
                    }
                }

                results.families++;
            } catch (err) {
                results.errors.push({
                    type: 'family',
                    id: fam.pointer,
                    error: err.message
                });
            }
        }

    } catch (err) {
        results.errors.push({
            type: 'parse',
            error: err.message
        });
    }

    return results;
};

/**
 * Export family tree data to GEDCOM format
 */
const exportGedcom = async (userId) => {
    // Get all members for this user
    const [members] = await pool.query(`
        SELECT * FROM family_members 
        WHERE user_id = ? AND merged_into IS NULL
        ORDER BY id
    `, [userId]);

    // Get all relationships
    const memberIds = members.map(m => m.id);
    if (memberIds.length === 0) {
        return '0 HEAD\n1 SOUR JuhuriHeritage\n1 GEDC\n2 VERS 5.5.1\n1 CHAR UTF-8\n0 TRLR\n';
    }

    const [parentChild] = await pool.query(`
        SELECT * FROM family_parent_child 
        WHERE parent_id IN (?) OR child_id IN (?)
    `, [memberIds, memberIds]);

    const [partnerships] = await pool.query(`
        SELECT * FROM family_partnerships 
        WHERE person1_id IN (?) OR person2_id IN (?)
    `, [memberIds, memberIds]);

    // Build GEDCOM content
    let gedcom = '';

    // Header
    gedcom += '0 HEAD\n';
    gedcom += '1 SOUR JuhuriHeritage\n';
    gedcom += '2 VERS 2.0\n';
    gedcom += '2 NAME Juhuri Heritage Family Tree\n';
    gedcom += '1 GEDC\n';
    gedcom += '2 VERS 5.5.1\n';
    gedcom += '2 FORM LINEAGE-LINKED\n';
    gedcom += '1 CHAR UTF-8\n';
    gedcom += `1 DATE ${formatGedcomDate(new Date().toISOString())}\n`;

    // Export individuals
    for (const member of members) {
        gedcom += `0 @I${member.id}@ INDI\n`;
        gedcom += `1 NAME ${member.first_name} /${member.last_name}/\n`;

        if (member.nickname) {
            gedcom += `2 NICK ${member.nickname}\n`;
        }

        if (member.gender) {
            gedcom += `1 SEX ${member.gender === 'male' ? 'M' : member.gender === 'female' ? 'F' : 'U'}\n`;
        }

        if (member.birth_date || member.birth_place) {
            gedcom += '1 BIRT\n';
            if (member.birth_date) gedcom += `2 DATE ${formatGedcomDate(member.birth_date)}\n`;
            if (member.birth_place) gedcom += `2 PLAC ${member.birth_place}\n`;
        }

        if (member.death_date || member.death_place || !member.is_alive) {
            gedcom += '1 DEAT\n';
            if (member.death_date) gedcom += `2 DATE ${formatGedcomDate(member.death_date)}\n`;
            if (member.death_place) gedcom += `2 PLAC ${member.death_place}\n`;
        }

        if (member.biography) {
            gedcom += `1 NOTE ${member.biography.substring(0, 248)}\n`;
        }
    }

    // Group relationships into families
    const familyMap = new Map(); // "parent1-parent2" -> { parents: [], children: [] }

    for (const p of partnerships) {
        const key = `${Math.min(p.person1_id, p.person2_id)}-${Math.max(p.person1_id, p.person2_id)}`;
        if (!familyMap.has(key)) {
            familyMap.set(key, {
                husband: members.find(m => m.id === p.person1_id && m.gender === 'male')?.id || p.person1_id,
                wife: members.find(m => m.id === p.person2_id && m.gender === 'female')?.id ||
                    members.find(m => m.id === p.person1_id && m.gender === 'female')?.id || p.person2_id,
                children: [],
                married: p.status === 'married',
                divorced: p.status === 'divorced'
            });
        }
    }

    // Add children to families
    for (const pc of parentChild) {
        // Find which family this belongs to
        for (const [key, fam] of familyMap.entries()) {
            if (fam.husband === pc.parent_id || fam.wife === pc.parent_id) {
                if (!fam.children.includes(pc.child_id)) {
                    fam.children.push(pc.child_id);
                }
            }
        }
    }

    // Export families
    let famId = 1;
    for (const [key, fam] of familyMap.entries()) {
        gedcom += `0 @F${famId}@ FAM\n`;

        if (fam.husband) gedcom += `1 HUSB @I${fam.husband}@\n`;
        if (fam.wife) gedcom += `1 WIFE @I${fam.wife}@\n`;

        for (const childId of fam.children) {
            gedcom += `1 CHIL @I${childId}@\n`;
        }

        if (fam.married) gedcom += '1 MARR\n';
        if (fam.divorced) gedcom += '1 DIV\n';

        famId++;
    }

    // Trailer
    gedcom += '0 TRLR\n';

    return gedcom;
};

module.exports = {
    importGedcom,
    exportGedcom,
    parseGedcomDate,
    formatGedcomDate
};
