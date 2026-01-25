-- Migration: Add generation column to family_members table
-- This enables hierarchical tree layouts and better visualization

ALTER TABLE family_members
ADD COLUMN generation INT DEFAULT 0 COMMENT '0 = oldest ancestor, higher = younger generation';

-- Add index for generation queries
CREATE INDEX idx_family_generation ON family_members(generation);
