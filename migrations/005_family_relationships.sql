-- Migration: Advanced Family Tree Relationships
-- Adds relationship tables and additional name fields

-- =====================================================
-- PHASE 1: Add new columns to family_members
-- =====================================================

ALTER TABLE family_members 
ADD COLUMN IF NOT EXISTS nickname VARCHAR(100) AFTER maiden_name,
ADD COLUMN IF NOT EXISTS previous_name VARCHAR(100) AFTER nickname,
ADD COLUMN IF NOT EXISTS title VARCHAR(50) AFTER previous_name;

-- =====================================================
-- PHASE 2: Create Parent-Child Relationships Table
-- =====================================================

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

-- =====================================================
-- PHASE 3: Create Partnerships Table
-- =====================================================

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

-- =====================================================
-- PHASE 4: Migrate existing data
-- =====================================================

-- Migrate father relationships
INSERT IGNORE INTO family_parent_child (parent_id, child_id, relationship_type)
SELECT father_id, id, 'biological' 
FROM family_members 
WHERE father_id IS NOT NULL;

-- Migrate mother relationships
INSERT IGNORE INTO family_parent_child (parent_id, child_id, relationship_type)
SELECT mother_id, id, 'biological' 
FROM family_members 
WHERE mother_id IS NOT NULL;

-- Migrate spouse relationships (as married)
INSERT IGNORE INTO family_partnerships (person1_id, person2_id, status)
SELECT 
    LEAST(id, spouse_id),
    GREATEST(id, spouse_id),
    'married'
FROM family_members 
WHERE spouse_id IS NOT NULL
GROUP BY LEAST(id, spouse_id), GREATEST(id, spouse_id);

-- =====================================================
-- PHASE 5: Indexes for performance
-- =====================================================

CREATE INDEX idx_parent_child_parent ON family_parent_child(parent_id);
CREATE INDEX idx_parent_child_child ON family_parent_child(child_id);
CREATE INDEX idx_partnerships_person1 ON family_partnerships(person1_id);
CREATE INDEX idx_partnerships_person2 ON family_partnerships(person2_id);
