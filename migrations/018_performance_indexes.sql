-- Migration 018: Add performance indexes for production
-- These indexes optimize the most frequent queries: search, widget data, admin listings

-- Dictionary entries: status-based queries, term search
CREATE INDEX IF NOT EXISTS idx_de_status_created ON dictionary_entries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_de_term ON dictionary_entries(term(100));

-- Translations: foreign key lookups and search
CREATE INDEX IF NOT EXISTS idx_translations_entry_id ON translations(entry_id);
CREATE INDEX IF NOT EXISTS idx_translations_hebrew ON translations(hebrew(100));

-- Definitions & Examples: foreign key lookups
CREATE INDEX IF NOT EXISTS idx_definitions_entry_id ON definitions(entry_id);
CREATE INDEX IF NOT EXISTS idx_examples_entry_id ON examples(entry_id);

-- Field sources: entry lookup
CREATE INDEX IF NOT EXISTS idx_field_sources_entry ON field_sources(entry_id, field_name);

-- Comments: entry listing
CREATE INDEX IF NOT EXISTS idx_comments_entry_id ON comments(entry_id);

-- Likes: unique pair lookups
CREATE INDEX IF NOT EXISTS idx_entry_likes_pair ON entry_likes(entry_id, user_id);

-- Translation votes: unique pair lookups
CREATE INDEX IF NOT EXISTS idx_translation_votes_pair ON translation_votes(translation_id, user_id);

-- System logs: activity feed queries
CREATE INDEX IF NOT EXISTS idx_system_logs_type_created ON system_logs(event_type, created_at DESC);

-- Translation suggestions: admin pending queue
CREATE INDEX IF NOT EXISTS idx_suggestions_status_created ON translation_suggestions(status, created_at DESC);

-- Community examples: entry lookup + status filter
CREATE INDEX IF NOT EXISTS idx_community_examples_entry ON community_examples(entry_id, status);

-- Marketplace vendors: active vendor listing
CREATE INDEX IF NOT EXISTS idx_marketplace_vendors_active ON marketplace_vendors(is_active);

-- Site feedback: admin listing by status
CREATE INDEX IF NOT EXISTS idx_site_feedback_status ON site_feedback(status, created_at DESC);
