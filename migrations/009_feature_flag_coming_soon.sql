-- Migration 009: Add coming_soon status to feature flags
-- Adds coming_soon as a valid status option

ALTER TABLE feature_flags 
MODIFY COLUMN status ENUM('active', 'admin_only', 'coming_soon', 'disabled') DEFAULT 'disabled';
