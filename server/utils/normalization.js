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
 * Normalize a term for duplicate detection.
 * Returns lowercase, niqqud-stripped, whitespace-normalized string.
 */
function normalizeTerm(term) {
    if (!term) return '';
    return stripNiqqud(term).toLowerCase();
}

module.exports = { stripNiqqud, normalizeTerm };
