-- Migration 006: Community Family Tree Features
-- Adds support for collaborative editing, merge suggestions, and audit trail

-- 1. Add external ID fields for GEDCOM and other imports
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS external_id VARCHAR(100) NULL;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS external_source VARCHAR(50) NULL COMMENT 'gedcom, myheritage, manual';

-- 2. Add Soundex column for phonetic search (auto-generated)
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS last_name_soundex VARCHAR(10) 
    GENERATED ALWAYS AS (SOUNDEX(last_name)) STORED;

-- 3. Add merged_into field for soft-delete after merge
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS merged_into INT NULL;
ALTER TABLE family_members ADD CONSTRAINT fk_merged_into 
    FOREIGN KEY (merged_into) REFERENCES family_members(id) ON DELETE SET NULL;

-- 4. Create index for Soundex search
CREATE INDEX IF NOT EXISTS idx_soundex_lastname ON family_members(last_name_soundex);
CREATE INDEX IF NOT EXISTS idx_external_id ON family_members(external_id);

-- 5. Audit Log - Track all changes to family members
CREATE TABLE IF NOT EXISTS family_member_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    changed_by INT NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    field_name VARCHAR(50),
    old_value TEXT,
    new_value TEXT,
    change_type ENUM('create', 'update', 'delete', 'merge') DEFAULT 'update',
    INDEX idx_member_history (member_id),
    INDEX idx_changed_by (changed_by),
    FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Merge Suggestions - When duplicates are detected
CREATE TABLE IF NOT EXISTS family_merge_suggestions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member1_id INT NOT NULL,
    member2_id INT NOT NULL,
    suggested_by INT NULL,
    suggested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confidence_score DECIMAL(3,2) DEFAULT 0.50 COMMENT '0.00 to 1.00',
    reason TEXT COMMENT 'Why this merge was suggested',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,
    INDEX idx_status (status),
    INDEX idx_member1 (member1_id),
    INDEX idx_member2 (member2_id),
    FOREIGN KEY (member1_id) REFERENCES family_members(id) ON DELETE CASCADE,
    FOREIGN KEY (member2_id) REFERENCES family_members(id) ON DELETE CASCADE,
    FOREIGN KEY (suggested_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 7. Contributors - Track who contributed to each member
CREATE TABLE IF NOT EXISTS family_member_contributors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    user_id INT NOT NULL,
    contribution_type ENUM('creator', 'editor', 'verifier') DEFAULT 'editor',
    contributed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT NULL,
    UNIQUE KEY unique_contribution (member_id, user_id, contribution_type),
    INDEX idx_member_contributors (member_id),
    INDEX idx_user_contributions (user_id),
    FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Link Suggestions - When someone wants to connect their tree to existing person
CREATE TABLE IF NOT EXISTS family_link_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requester_id INT NOT NULL COMMENT 'User making the request',
    source_member_id INT NOT NULL COMMENT 'Member in requester tree',
    target_member_id INT NOT NULL COMMENT 'Existing member to link to',
    relationship_type ENUM('same_person', 'parent', 'child', 'spouse') NOT NULL,
    message TEXT NULL COMMENT 'Explanation from requester',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,
    INDEX idx_link_status (status),
    INDEX idx_target_member (target_member_id),
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (source_member_id) REFERENCES family_members(id) ON DELETE CASCADE,
    FOREIGN KEY (target_member_id) REFERENCES family_members(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);
