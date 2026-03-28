/**
 * Shared normalization utilities for dictionary entries.
 * Used by both the live API and offline deduplication scripts.
 */

/**
 * Strip niqqud (Hebrew vowel marks) and normalize whitespace.
 */
function stripNiqqud(s) {
    return (s || '')
        .replace(/[\u0591-\u05C7]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Normalize a Hebrew-script string for duplicate detection.
 * Returns lowercase, niqqud-stripped, whitespace-normalized string.
 */
function normalizeHebrewScript(term) {
    if (!term) return '';
    return stripNiqqud(term).toLowerCase();
}

// Backward-compatible alias
const normalizeTerm = normalizeHebrewScript;

module.exports = { stripNiqqud, normalizeHebrewScript, normalizeTerm };
