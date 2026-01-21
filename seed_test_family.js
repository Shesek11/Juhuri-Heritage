/**
 * Seed Comprehensive Test Family for Family Tree Development
 * Creates a complex family structure with:
 * - Two grandparent couples (משפחות כהן ולוי)
 * - Multiple children per couple
 * - Cross-marriage between families
 * - Various partnership statuses (married, divorced, widowed, remarried)
 * - Shared children and step-children
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function seedTestFamily() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'juhuri_dev'
    });

    try {
        console.log('🌳 Starting comprehensive family seed...\n');

        // Clear existing test data (optional - comment out to keep existing)
        console.log('🧹 Clearing existing family data...');
        await connection.query('DELETE FROM family_parent_child');
        await connection.query('DELETE FROM family_partnerships');
        await connection.query('DELETE FROM family_members');

        // ========== GENERATION 1: GRANDPARENTS ==========
        console.log('\n👴 Creating Generation 1 (Grandparents)...');

        // COHEN FAMILY - Grandfather & Grandmother
        const [cohenGrandfather] = await connection.query(`
            INSERT INTO family_members (first_name, last_name, gender, birth_date, birth_place, is_alive, user_id)
            VALUES ('מרדכי', 'כהן', 'male', '1930-03-15', 'דרבנט, דגסטן', false, 1)
        `);
        const cohenGfId = cohenGrandfather.insertId;
        console.log(`  ✅ מרדכי כהן (סבא) - ID: ${cohenGfId}`);

        const [cohenGrandmother] = await connection.query(`
            INSERT INTO family_members (first_name, last_name, maiden_name, gender, birth_date, birth_place, death_date, is_alive, user_id)
            VALUES ('שרה', 'כהן', 'אשורוב', 'female', '1935-07-22', 'קובה, אזרבייג\'ן', '2020-01-10', false, 1)
        `);
        const cohenGmId = cohenGrandmother.insertId;
        console.log(`  ✅ שרה כהן (סבתא) - ID: ${cohenGmId}`);

        // Partnership: Cohen grandparents (married)
        await connection.query(`
            INSERT INTO family_partnerships (person1_id, person2_id, status, start_date)
            VALUES (?, ?, 'married', '1952-06-10')
        `, [cohenGfId, cohenGmId]);
        console.log(`  💍 נישואין: מרדכי ← שרה`);

        // LEVI FAMILY - Grandfather & Grandmother
        const [leviGrandfather] = await connection.query(`
            INSERT INTO family_members (first_name, last_name, gender, birth_date, birth_place, is_alive, user_id)
            VALUES ('יעקב', 'לוי', 'male', '1928-11-05', 'וורטשן, אזרבייג\'ן', false, 1)
        `);
        const leviGfId = leviGrandfather.insertId;
        console.log(`  ✅ יעקב לוי (סבא) - ID: ${leviGfId}`);

        const [leviGrandmother] = await connection.query(`
            INSERT INTO family_members (first_name, last_name, maiden_name, gender, birth_date, birth_place, is_alive, user_id)
            VALUES ('רחל', 'לוי', 'נסימוב', 'female', '1932-04-18', 'נלצ\'יק, רוסיה', true, 1)
        `);
        const leviGmId = leviGrandmother.insertId;
        console.log(`  ✅ רחל לוי (סבתא) - ID: ${leviGmId}`);

        // Partnership: Levi grandparents (widowed - grandfather passed)
        await connection.query(`
            INSERT INTO family_partnerships (person1_id, person2_id, status, start_date)
            VALUES (?, ?, 'widowed', '1950-09-20')
        `, [leviGfId, leviGmId]);
        console.log(`  💍 נישואין (אלמנה): יעקב ← רחל`);

        // ========== GENERATION 2: PARENTS (Children of Grandparents) ==========
        console.log('\n👨‍👩‍👧‍👦 Creating Generation 2 (Parents)...');

        // COHEN CHILDREN
        const [cohenSon1] = await connection.query(`
            INSERT INTO family_members (first_name, last_name, gender, birth_date, is_alive, user_id)
            VALUES ('דוד', 'כהן', 'male', '1955-02-14', true, 1)
        `);
        const davidCohenId = cohenSon1.insertId;
        await connection.query('INSERT INTO family_parent_child (parent_id, child_id, relationship_type) VALUES (?, ?, ?), (?, ?, ?)',
            [cohenGfId, davidCohenId, 'biological', cohenGmId, davidCohenId, 'biological']);
        console.log(`  ✅ דוד כהן (בן של מרדכי ושרה) - ID: ${davidCohenId}`);

        const [cohenDaughter1] = await connection.query(`
            INSERT INTO family_members (first_name, last_name, maiden_name, gender, birth_date, is_alive, user_id)
            VALUES ('מרים', 'לוי', 'כהן', 'female', '1958-08-30', true, 1)
        `);
        const miriamId = cohenDaughter1.insertId;
        await connection.query('INSERT INTO family_parent_child (parent_id, child_id, relationship_type) VALUES (?, ?, ?), (?, ?, ?)',
            [cohenGfId, miriamId, 'biological', cohenGmId, miriamId, 'biological']);
        console.log(`  ✅ מרים לוי (לבית כהן) - ID: ${miriamId}`);

        const [cohenSon2] = await connection.query(`
            INSERT INTO family_members (first_name, last_name, gender, birth_date, death_date, is_alive, user_id)
            VALUES ('אברהם', 'כהן', 'male', '1962-12-01', '2015-06-15', false, 1)
        `);
        const avrahamCohenId = cohenSon2.insertId;
        await connection.query('INSERT INTO family_parent_child (parent_id, child_id, relationship_type) VALUES (?, ?, ?), (?, ?, ?)',
            [cohenGfId, avrahamCohenId, 'biological', cohenGmId, avrahamCohenId, 'biological']);
        console.log(`  ✅ אברהם כהן (נפטר) - ID: ${avrahamCohenId}`);

        // LEVI CHILDREN
        const [leviSon1] = await connection.query(`
            INSERT INTO family_members (first_name, last_name, gender, birth_date, is_alive, user_id)
            VALUES ('משה', 'לוי', 'male', '1954-05-12', true, 1)
        `);
        const mosheLeviId = leviSon1.insertId;
        await connection.query('INSERT INTO family_parent_child (parent_id, child_id, relationship_type) VALUES (?, ?, ?), (?, ?, ?)',
            [leviGfId, mosheLeviId, 'biological', leviGmId, mosheLeviId, 'biological']);
        console.log(`  ✅ משה לוי (בן של יעקב ורחל) - ID: ${mosheLeviId}`);

        const [leviDaughter1] = await connection.query(`
            INSERT INTO family_members (first_name, last_name, maiden_name, gender, birth_date, is_alive, user_id)
            VALUES ('אסתר', 'כהן', 'לוי', 'female', '1960-10-08', true, 1)
        `);
        const esterId = leviDaughter1.insertId;
        await connection.query('INSERT INTO family_parent_child (parent_id, child_id, relationship_type) VALUES (?, ?, ?), (?, ?, ?)',
            [leviGfId, esterId, 'biological', leviGmId, esterId, 'biological']);
        console.log(`  ✅ אסתר כהן (לבית לוי) - ID: ${esterId}`);

        // ========== CROSS-FAMILY MARRIAGES ==========
        console.log('\n💒 Creating Cross-Family Marriages...');

        // משה לוי (מלוי) married מרים כהן (מכהן)
        await connection.query(`
            INSERT INTO family_partnerships (person1_id, person2_id, status, start_date)
            VALUES (?, ?, 'married', '1980-04-15')
        `, [mosheLeviId, miriamId]);
        console.log(`  💍 משה לוי × מרים כהן (נשואים)`);

        // דוד כהן had 2 marriages:
        // 1. First wife (divorced)
        const [firstWife] = await connection.query(`
            INSERT INTO family_members (first_name, last_name, maiden_name, gender, birth_date, is_alive, user_id)
            VALUES ('דינה', 'כהן', 'יצחקוב', 'female', '1957-03-20', true, 1)
        `);
        const dinaId = firstWife.insertId;
        await connection.query(`
            INSERT INTO family_partnerships (person1_id, person2_id, status, start_date, end_date)
            VALUES (?, ?, 'divorced', '1978-06-01', '1990-03-15')
        `, [davidCohenId, dinaId]);
        console.log(`  💔 דוד כהן × דינה (גרושים)`);

        // 2. Second wife (current - married אסתר from Levi family!)
        await connection.query(`
            INSERT INTO family_partnerships (person1_id, person2_id, status, start_date)
            VALUES (?, ?, 'married', '1992-09-10')
        `, [davidCohenId, esterId]);
        console.log(`  💍 דוד כהן × אסתר לוי (נשואים - נישואין שניים)`);

        // אברהם כהן was married (wife is now widow)
        const [avrahamWife] = await connection.query(`
            INSERT INTO family_members (first_name, last_name, maiden_name, gender, birth_date, is_alive, user_id)
            VALUES ('לאה', 'כהן', 'שמואלוב', 'female', '1965-07-14', true, 1)
        `);
        const leahId = avrahamWife.insertId;
        await connection.query(`
            INSERT INTO family_partnerships (person1_id, person2_id, status, start_date)
            VALUES (?, ?, 'widowed', '1988-11-20')
        `, [avrahamCohenId, leahId]);
        console.log(`  💔 אברהם כהן × לאה (אלמנה)`);

        // ========== GENERATION 3: GRANDCHILDREN ==========
        console.log('\n👶 Creating Generation 3 (Grandchildren)...');

        // Children of משה & מרים
        const [child1] = await connection.query(`
            INSERT INTO family_members (first_name, last_name, gender, birth_date, is_alive, user_id)
            VALUES ('יוסף', 'לוי', 'male', '1982-01-25', true, 1)
        `);
        const yosefId = child1.insertId;
        await connection.query('INSERT INTO family_parent_child (parent_id, child_id, relationship_type) VALUES (?, ?, ?), (?, ?, ?)',
            [mosheLeviId, yosefId, 'biological', miriamId, yosefId, 'biological']);
        console.log(`  ✅ יוסף לוי (בן של משה ומרים) - ID: ${yosefId}`);

        const [child2] = await connection.query(`
            INSERT INTO family_members (first_name, last_name, gender, birth_date, is_alive, user_id)
            VALUES ('תמר', 'לוי', 'female', '1985-06-18', true, 1)
        `);
        const tamarId = child2.insertId;
        await connection.query('INSERT INTO family_parent_child (parent_id, child_id, relationship_type) VALUES (?, ?, ?), (?, ?, ?)',
            [mosheLeviId, tamarId, 'biological', miriamId, tamarId, 'biological']);
        console.log(`  ✅ תמר לוי (בת של משה ומרים) - ID: ${tamarId}`);

        // Children of דוד & דינה (first marriage)
        const [child3] = await connection.query(`
            INSERT INTO family_members (first_name, last_name, gender, birth_date, is_alive, user_id)
            VALUES ('יצחק', 'כהן', 'male', '1980-09-12', true, 1)
        `);
        const yitzchakId = child3.insertId;
        await connection.query('INSERT INTO family_parent_child (parent_id, child_id, relationship_type) VALUES (?, ?, ?), (?, ?, ?)',
            [davidCohenId, yitzchakId, 'biological', dinaId, yitzchakId, 'biological']);
        console.log(`  ✅ יצחק כהן (בן של דוד ודינה) - ID: ${yitzchakId}`);

        // Children of דוד & אסתר (second marriage)
        const [child4] = await connection.query(`
            INSERT INTO family_members (first_name, last_name, gender, birth_date, is_alive, user_id)
            VALUES ('נועה', 'כהן', 'female', '1994-12-05', true, 1)
        `);
        const noaId = child4.insertId;
        await connection.query('INSERT INTO family_parent_child (parent_id, child_id, relationship_type) VALUES (?, ?, ?), (?, ?, ?)',
            [davidCohenId, noaId, 'biological', esterId, noaId, 'biological']);
        console.log(`  ✅ נועה כהן (בת של דוד ואסתר) - ID: ${noaId}`);

        const [child5] = await connection.query(`
            INSERT INTO family_members (first_name, last_name, gender, birth_date, is_alive, user_id)
            VALUES ('אריאל', 'כהן', 'male', '1997-03-22', true, 1)
        `);
        const arielId = child5.insertId;
        await connection.query('INSERT INTO family_parent_child (parent_id, child_id, relationship_type) VALUES (?, ?, ?), (?, ?, ?)',
            [davidCohenId, arielId, 'biological', esterId, arielId, 'biological']);
        console.log(`  ✅ אריאל כהן (בן של דוד ואסתר) - ID: ${arielId}`);

        // Children of אברהם & לאה
        const [child6] = await connection.query(`
            INSERT INTO family_members (first_name, last_name, gender, birth_date, is_alive, user_id)
            VALUES ('שלמה', 'כהן', 'male', '1990-08-30', true, 1)
        `);
        const shlomoId = child6.insertId;
        await connection.query('INSERT INTO family_parent_child (parent_id, child_id, relationship_type) VALUES (?, ?, ?), (?, ?, ?)',
            [avrahamCohenId, shlomoId, 'biological', leahId, shlomoId, 'biological']);
        console.log(`  ✅ שלמה כהן (בן של אברהם ולאה, יתום מאב) - ID: ${shlomoId}`);

        // ========== GENERATION 4: Great-grandchildren (sample) ==========
        console.log('\n👶👶 Creating Generation 4 (Great-Grandchildren)...');

        // יוסף married and has children
        const [yosefWife] = await connection.query(`
            INSERT INTO family_members (first_name, last_name, maiden_name, gender, birth_date, is_alive, user_id)
            VALUES ('רונית', 'לוי', 'מיכאלוב', 'female', '1984-04-10', true, 1)
        `);
        const ronitId = yosefWife.insertId;
        await connection.query(`
            INSERT INTO family_partnerships (person1_id, person2_id, status, start_date)
            VALUES (?, ?, 'married', '2008-07-15')
        `, [yosefId, ronitId]);
        console.log(`  💍 יוסף לוי × רונית (נשואים)`);

        const [greatGrandchild1] = await connection.query(`
            INSERT INTO family_members (first_name, last_name, gender, birth_date, is_alive, user_id)
            VALUES ('עומר', 'לוי', 'male', '2010-02-28', true, 1)
        `);
        const omerId = greatGrandchild1.insertId;
        await connection.query('INSERT INTO family_parent_child (parent_id, child_id, relationship_type) VALUES (?, ?, ?), (?, ?, ?)',
            [yosefId, omerId, 'biological', ronitId, omerId, 'biological']);
        console.log(`  ✅ עומר לוי (נין, בן של יוסף ורונית) - ID: ${omerId}`);

        const [greatGrandchild2] = await connection.query(`
            INSERT INTO family_members (first_name, last_name, gender, birth_date, is_alive, user_id)
            VALUES ('מיה', 'לוי', 'female', '2013-11-15', true, 1)
        `);
        const mayaId = greatGrandchild2.insertId;
        await connection.query('INSERT INTO family_parent_child (parent_id, child_id, relationship_type) VALUES (?, ?, ?), (?, ?, ?)',
            [yosefId, mayaId, 'biological', ronitId, mayaId, 'biological']);
        console.log(`  ✅ מיה לוי (נינה, בת של יוסף ורונית) - ID: ${mayaId}`);

        // ========== SUMMARY ==========
        const [memberCount] = await connection.query('SELECT COUNT(*) as count FROM family_members');
        const [partnershipCount] = await connection.query('SELECT COUNT(*) as count FROM family_partnerships');
        const [parentChildCount] = await connection.query('SELECT COUNT(*) as count FROM family_parent_child');

        console.log('\n' + '='.repeat(50));
        console.log('📊 SUMMARY');
        console.log('='.repeat(50));
        console.log(`👥 Total family members: ${memberCount[0].count}`);
        console.log(`💍 Total partnerships: ${partnershipCount[0].count}`);
        console.log(`👨‍👧 Total parent-child relationships: ${parentChildCount[0].count}`);
        console.log('\n✨ Test family seeded successfully!');

    } catch (error) {
        console.error('❌ Error seeding family:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

seedTestFamily();
