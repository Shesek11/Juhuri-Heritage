/**
 * Run Family Relationships Migration
 * Creates new relationship tables and migrates existing data
 * 
 * Run with: node run_family_relationships_migration.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const migrationSQL = `
-- Add new columns to family_members (MySQL syntax without IF NOT EXISTS for columns)
ALTER TABLE family_members 
ADD COLUMN nickname VARCHAR(100) AFTER maiden_name;

ALTER TABLE family_members 
ADD COLUMN previous_name VARCHAR(100) AFTER nickname;

ALTER TABLE family_members 
ADD COLUMN title VARCHAR(50) AFTER previous_name;

-- Create Parent-Child Relationships Table
CREATE TABLE IF NOT EXISTS family_parent_child (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parent_id INT NOT NULL,
    child_id INT NOT NULL,
    relationship_type ENUM('biological', 'adopted', 'foster', 'step') DEFAULT 'biological',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (parent_id) REFERENCES family_members(id) ON DELETE CASCADE,
    FOREIGN KEY (child_id) REFERENCES family_members(id) ON DELETE CASCADE,
    UNIQUE KEY unique_parent_child (parent_id, child_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create Partnerships Table
CREATE TABLE IF NOT EXISTS family_partnerships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    person1_id INT NOT NULL,
    person2_id INT NOT NULL,
    status ENUM('married', 'divorced', 'widowed', 'common_law', 'separated', 'engaged') NOT NULL DEFAULT 'married',
    start_date DATE,
    end_date DATE,
    marriage_place VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (person1_id) REFERENCES family_members(id) ON DELETE CASCADE,
    FOREIGN KEY (person2_id) REFERENCES family_members(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
`;

async function runMigration() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || process.env.DB_NAME || 'juhuri',
        multipleStatements: true
    });

    console.log('📦 Connected to database');

    try {
        // Check if columns already exist
        const [cols] = await connection.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'family_members' 
            AND COLUMN_NAME IN ('nickname', 'previous_name', 'title')
        `);

        if (cols.length === 0) {
            console.log('➕ Adding new columns to family_members...');
            await connection.query(`
                ALTER TABLE family_members 
                ADD COLUMN nickname VARCHAR(100) AFTER maiden_name,
                ADD COLUMN previous_name VARCHAR(100) AFTER nickname,
                ADD COLUMN title VARCHAR(50) AFTER previous_name
            `);
            console.log('✅ Columns added');
        } else {
            console.log('⏭️ Columns already exist (' + cols.map(c => c.COLUMN_NAME).join(', ') + '), skipping...');
        }

        // Create tables
        console.log('📋 Creating relationship tables...');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS family_parent_child (
                id INT AUTO_INCREMENT PRIMARY KEY,
                parent_id INT NOT NULL,
                child_id INT NOT NULL,
                relationship_type ENUM('biological', 'adopted', 'foster', 'step') DEFAULT 'biological',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (parent_id) REFERENCES family_members(id) ON DELETE CASCADE,
                FOREIGN KEY (child_id) REFERENCES family_members(id) ON DELETE CASCADE,
                UNIQUE KEY unique_parent_child (parent_id, child_id)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        console.log('✅ family_parent_child table ready');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS family_partnerships (
                id INT AUTO_INCREMENT PRIMARY KEY,
                person1_id INT NOT NULL,
                person2_id INT NOT NULL,
                status ENUM('married', 'divorced', 'widowed', 'common_law', 'separated', 'engaged') NOT NULL DEFAULT 'married',
                start_date DATE,
                end_date DATE,
                marriage_place VARCHAR(255),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                FOREIGN KEY (person1_id) REFERENCES family_members(id) ON DELETE CASCADE,
                FOREIGN KEY (person2_id) REFERENCES family_members(id) ON DELETE CASCADE
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        console.log('✅ family_partnerships table ready');

        // Migrate existing data
        console.log('🔄 Migrating existing relationships...');

        // Migrate father relationships
        const [fatherMigrate] = await connection.query(`
            INSERT IGNORE INTO family_parent_child (parent_id, child_id, relationship_type)
            SELECT father_id, id, 'biological' 
            FROM family_members 
            WHERE father_id IS NOT NULL
        `);
        console.log(`   ✅ Migrated ${fatherMigrate.affectedRows} father relationships`);

        // Migrate mother relationships
        const [motherMigrate] = await connection.query(`
            INSERT IGNORE INTO family_parent_child (parent_id, child_id, relationship_type)
            SELECT mother_id, id, 'biological' 
            FROM family_members 
            WHERE mother_id IS NOT NULL
        `);
        console.log(`   ✅ Migrated ${motherMigrate.affectedRows} mother relationships`);

        // Migrate spouse relationships
        const [spouseMigrate] = await connection.query(`
            INSERT IGNORE INTO family_partnerships (person1_id, person2_id, status)
            SELECT 
                LEAST(id, spouse_id),
                GREATEST(id, spouse_id),
                'married'
            FROM family_members 
            WHERE spouse_id IS NOT NULL
            GROUP BY LEAST(id, spouse_id), GREATEST(id, spouse_id)
        `);
        console.log(`   ✅ Migrated ${spouseMigrate.affectedRows} spouse relationships`);

        // Create indexes
        console.log('📊 Creating indexes...');
        try {
            await connection.query('CREATE INDEX idx_parent_child_parent ON family_parent_child(parent_id)');
            await connection.query('CREATE INDEX idx_parent_child_child ON family_parent_child(child_id)');
            await connection.query('CREATE INDEX idx_partnerships_person1 ON family_partnerships(person1_id)');
            await connection.query('CREATE INDEX idx_partnerships_person2 ON family_partnerships(person2_id)');
            console.log('✅ Indexes created');
        } catch (indexErr) {
            if (indexErr.code === 'ER_DUP_KEYNAME') {
                console.log('⏭️ Indexes already exist');
            } else {
                throw indexErr;
            }
        }

        console.log('\n🎉 Migration completed successfully!');

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        throw err;
    } finally {
        await connection.end();
    }
}

runMigration().catch(console.error);
