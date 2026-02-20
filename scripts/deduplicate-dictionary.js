#!/usr/bin/env node

/**
 * Deduplicate dictionary entries.
 *
 * Input:  data/processed/dictionary-unified-with-hebrew.json
 * Output: data/processed/dictionary-unified-deduped.json
 *
 * Strategy:
 * 1. Group by normalised term (strip niqqud, normalise whitespace)
 * 2. Merge groups: combine fields, keep all unique translation variants
 * 3. When two entries have different hebrew/russian translations,
 *    store both separated by " ; " in the same field.
 */

const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../data/processed/dictionary-unified-with-hebrew.json');
const OUTPUT = path.resolve(__dirname, '../data/processed/dictionary-unified-deduped.json');

/**
 * Strip niqqud (Hebrew vowel marks) and normalise whitespace.
 */
function stripNiqqud(s) {
  return (s || '')
    .replace(/[\u0591-\u05C7]/g, '')  // remove niqqud & cantillation
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Create a normalisation key for grouping entries.
 * Priority: term (normalised), then latin (lowercased).
 */
function normKey(entry) {
  const term = stripNiqqud(entry.term || '');
  if (term) return `term:${term}`;

  const latin = (entry.latin || '').trim().toLowerCase();
  if (latin) return `lat:${latin}`;

  return null;
}

/**
 * Merge a list of values, deduplicating and joining with " ; ".
 * Skips empty values. If all values are the same returns a single value.
 */
function mergeValues(values) {
  const unique = [...new Set(
    values
      .map(v => (v || '').trim())
      .filter(Boolean)
  )];
  return unique.join(' ; ');
}

/**
 * Check if two Hebrew strings are near-duplicates
 * (differ only in minor phrasing, parenthetical notes, or ה vs א spelling).
 */
function hebrewSimilar(a, b) {
  if (!a || !b) return false;
  const na = a.replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
  const nb = b.replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
  if (na === nb) return true;
  // One contains the other
  if (na.includes(nb) || nb.includes(na)) return true;
  return false;
}

/**
 * Merge an array of entries that share the same term into one entry.
 */
function mergeGroup(group) {
  if (group.length === 1) return group[0];

  // Start with the richest entry (most non-empty fields)
  group.sort((a, b) => {
    const score = e =>
      (e.term ? 1 : 0) + (e.latin ? 1 : 0) + (e.hebrew ? 1 : 0) +
      (e.russian ? 1 : 0) + (e.partOfSpeech ? 1 : 0) + (e.definition ? 1 : 0) +
      (e.pronunciationGuide ? 1 : 0);
    return score(b) - score(a);
  });

  const base = { ...group[0] };

  // Collect all unique values per field
  const hebrews = group.map(e => e.hebrew);
  const russians = group.map(e => e.russian);
  const definitions = group.map(e => e.definition);
  const poses = group.map(e => e.partOfSpeech);

  // For hebrew/russian: deduplicate, but also remove near-duplicates
  base.hebrew = smartMerge(hebrews);
  base.russian = smartMerge(russians);
  base.definition = smartMerge(definitions);

  // For single-value fields, prefer non-empty
  for (const field of ['term', 'latin', 'pronunciationGuide', 'dialect']) {
    if (!base[field]) {
      for (const e of group) {
        if (e[field]) { base[field] = e[field]; break; }
      }
    }
  }

  // Prefer the longest/most specific term (with niqqud)
  const terms = group.map(e => e.term).filter(Boolean);
  if (terms.length > 1) {
    // Pick the one with niqqud if available
    const withNiqqud = terms.find(t => /[\u0591-\u05C7]/.test(t));
    if (withNiqqud) base.term = withNiqqud;
  }

  // partOfSpeech: take first non-empty
  if (!base.partOfSpeech) {
    for (const e of group) {
      if (e.partOfSpeech) { base.partOfSpeech = e.partOfSpeech; break; }
    }
  }

  // Merge sources
  const allSources = new Set();
  for (const e of group) {
    if (Array.isArray(e.sources)) e.sources.forEach(s => allSources.add(s));
  }
  if (allSources.size > 0) base.sources = [...allSources];

  return base;
}

/**
 * Smart merge: deduplicate values, removing near-duplicates.
 * If "אמא" and "אימא" both appear, keep both.
 * If "ילדה" and "ילדה (גם בת)" appear, keep only the more specific one.
 */
function smartMerge(values) {
  const unique = [...new Set(
    values.map(v => (v || '').trim()).filter(Boolean)
  )];

  if (unique.length <= 1) return unique[0] || '';

  // Remove values that are substrings of another (keep the longer/more specific)
  const filtered = unique.filter((v, i) => {
    for (let j = 0; j < unique.length; j++) {
      if (i !== j && unique[j].includes(v) && unique[j] !== v) {
        return false; // v is contained in another, skip it
      }
    }
    return true;
  });

  return filtered.join(' ; ');
}

function run() {
  console.log('🔄 Deduplicating dictionary entries\n');

  const dict = JSON.parse(fs.readFileSync(INPUT, 'utf-8'));
  const entries = dict.entries;
  console.log(`📊 Input: ${entries.length} entries`);

  // Group by normalised key
  const groups = new Map();
  const noKey = [];

  for (const entry of entries) {
    const key = normKey(entry);
    if (!key) {
      noKey.push(entry);
      continue;
    }
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(entry);
  }

  // Stats on groups
  let dupGroups = 0;
  let dupEntries = 0;
  const dupSizes = {};

  for (const [key, group] of groups) {
    if (group.length > 1) {
      dupGroups++;
      dupEntries += group.length;
      dupSizes[group.length] = (dupSizes[group.length] || 0) + 1;
    }
  }

  console.log(`\n📊 Duplicate analysis:`);
  console.log(`   Unique keys: ${groups.size}`);
  console.log(`   Groups with duplicates: ${dupGroups}`);
  console.log(`   Total entries in duplicate groups: ${dupEntries}`);
  console.log(`   Entries without key: ${noKey.length}`);
  console.log(`   Size distribution: ${JSON.stringify(dupSizes)}`);

  // Merge groups
  const merged = [];
  let mergeCount = 0;

  for (const [key, group] of groups) {
    const entry = mergeGroup(group);
    merged.push(entry);
    if (group.length > 1) mergeCount++;
  }

  // Add no-key entries as-is
  merged.push(...noKey);

  console.log(`\n✅ After deduplication: ${merged.length} entries`);
  console.log(`🔀 Groups merged: ${mergeCount}`);
  console.log(`📉 Entries removed: ${entries.length - merged.length}`);

  // Show examples of merged entries
  console.log('\n📋 Examples of merged entries:');
  console.log('-'.repeat(60));
  let shown = 0;
  for (const [key, group] of groups) {
    if (group.length > 1 && shown < 15) {
      const m = mergeGroup(group);
      console.log(`  ${m.term || m.latin || '?'}`);
      console.log(`    hebrew: ${m.hebrew || '-'}`);
      console.log(`    russian: ${(m.russian || '-').substring(0, 60)}`);
      console.log(`    (merged ${group.length} entries)`);
      shown++;
    }
  }

  // Coverage stats
  let withHebrew = 0, withRussian = 0, withLatin = 0, withTerm = 0;
  for (const e of merged) {
    if (e.hebrew) withHebrew++;
    if (e.russian) withRussian++;
    if (e.latin) withLatin++;
    if (e.term) withTerm++;
  }

  console.log('\n📊 Field coverage (after dedup):');
  console.log(`   With term:    ${withTerm} (${(withTerm / merged.length * 100).toFixed(1)}%)`);
  console.log(`   With latin:   ${withLatin} (${(withLatin / merged.length * 100).toFixed(1)}%)`);
  console.log(`   With hebrew:  ${withHebrew} (${(withHebrew / merged.length * 100).toFixed(1)}%)`);
  console.log(`   With russian: ${withRussian} (${(withRussian / merged.length * 100).toFixed(1)}%)`);

  // Save
  const output = {
    timestamp: new Date().toISOString(),
    description: 'Unified Juhuri dictionary — deduplicated, with Hebrew translations',
    source: 'dictionary-unified-with-hebrew.json (deduplicated)',
    total_entries: merged.length,
    field_coverage: { withTerm, withLatin, withHebrew, withRussian },
    entries: merged,
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n💾 Saved: ${OUTPUT}`);
}

run();
