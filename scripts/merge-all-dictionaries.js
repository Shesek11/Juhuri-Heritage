#!/usr/bin/env node

/**
 * Merge all dictionary sources into one unified file.
 *
 * Step 1: Fix "תרגומים מסריקות.txt" (concatenated JSON arrays, missing closing bracket)
 * Step 2: Load all processed dictionaries
 * Step 3: Merge entries by Juhuri term - combine fields from different sources
 * Step 4: Save unified dictionary
 */

const fs = require('fs');
const path = require('path');

const PROCESSED_DIR = path.resolve(__dirname, '../data/processed');

// ============================================================
// Step 1: Fix and load "תרגומים מסריקות.txt"
// ============================================================

function loadScanTranslations() {
  const filePath = path.join(PROCESSED_DIR, 'תרגומים מסריקות.txt');
  if (!fs.existsSync(filePath)) {
    console.log('⚠️  תרגומים מסריקות.txt not found, skipping');
    return [];
  }

  let text = fs.readFileSync(filePath, 'utf-8');
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  // Split into chunks (file has multiple concatenated JSON arrays: ][)
  const chunks = text.split(/\]\s*\[/).map((chunk, i, arr) => {
    let c = chunk.trim();
    if (i === 0) c = c.replace(/^\[/, '');
    if (i === arr.length - 1) c = c.replace(/\]$/, '');
    return '[' + c + ']';
  });

  const allEntries = [];
  let failedChunks = 0;

  for (let i = 0; i < chunks.length; i++) {
    try {
      const data = JSON.parse(chunks[i]);
      allEntries.push(...data);
    } catch (e) {
      // Try salvaging: extract individual JSON objects with regex
      const objRegex = /\{[^{}]*\}/g;
      let match;
      let recovered = 0;
      while ((match = objRegex.exec(chunks[i])) !== null) {
        try {
          allEntries.push(JSON.parse(match[0]));
          recovered++;
        } catch (e2) {}
      }
      if (recovered > 0) {
        console.log(`   Chunk ${i + 1}: salvaged ${recovered} entries`);
      } else {
        failedChunks++;
      }
    }
  }

  console.log(`✅ תרגומים מסריקות.txt: ${allEntries.length} entries (from ${chunks.length} chunks, ${failedChunks} failed)`);

  // Save fixed version
  const fixedPath = path.join(PROCESSED_DIR, 'תרגומים מסריקות-fixed.json');
  fs.writeFileSync(fixedPath, JSON.stringify(allEntries, null, 2), 'utf-8');
  console.log(`   Saved fixed file: תרגומים מסריקות-fixed.json`);

  return allEntries.map(e => ({
    ...e,
    _source: 'scans',
  }));
}

// ============================================================
// Step 2: Load all processed dictionaries
// ============================================================

function loadProcessedFile(filename) {
  const filePath = path.join(PROCESSED_DIR, filename);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const entries = data.entries || data;
    const sourceName = data.source_name || filename;
    console.log(`✅ ${sourceName}: ${entries.length} entries`);
    return entries.map(e => ({ ...e, _source: sourceName }));
  } catch (err) {
    console.error(`❌ Failed to load ${filename}: ${err.message}`);
    return [];
  }
}

// ============================================================
// Step 3: Normalize and create merge key
// ============================================================

/**
 * Create a normalized key from the Juhuri term for matching.
 * We try multiple fields: term (Hebrew chars), latin, and cir (Cyrillic).
 */
function normalizeKey(entry) {
  // Priority: latin (most consistent across sources), then term, then cir
  const latin = (entry.latin || '').trim().toLowerCase()
    .replace(/[^a-zəçşğħⱨöüi\s\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (latin && latin.length > 0) return `lat:${latin}`;

  // Hebrew-char term
  const term = (entry.term || '').trim()
    .replace(/[\u0591-\u05C7]/g, '') // remove nikud
    .replace(/\s+/g, ' ')
    .trim();

  if (term && term.length > 0) return `heb:${term}`;

  return null;
}

/**
 * Merge two entries, preferring non-empty values.
 */
function mergeEntries(existing, incoming) {
  const merged = { ...existing };

  // For each field, prefer non-empty values
  const fields = ['term', 'latin', 'hebrew', 'russian', 'english',
    'partOfSpeech', 'definition', 'pronunciationGuide', 'dialect'];

  for (const field of fields) {
    const existVal = (existing[field] || '').trim();
    const newVal = (incoming[field] || '').trim();

    if (!existVal && newVal) {
      merged[field] = newVal;
    }
    // If both have values and they differ, keep existing but note the alternative
    // (we don't guess or override)
  }

  // Track sources
  const existSources = existing._sources || [existing._source || 'unknown'];
  const newSource = incoming._source || 'unknown';
  if (!existSources.includes(newSource)) {
    existSources.push(newSource);
  }
  merged._sources = existSources;

  return merged;
}

// ============================================================
// Main
// ============================================================

function run() {
  console.log('📚 Merging all dictionary sources\n');
  console.log('='.repeat(60));
  console.log('Step 1: Loading sources');
  console.log('='.repeat(60));

  const allEntries = [];

  // 1. Scan translations (fixed file)
  allEntries.push(...loadScanTranslations());

  // 2. Find all dictionary-*.json files in processed dir
  const files = fs.readdirSync(PROCESSED_DIR)
    .filter(f => f.endsWith('.json') && !f.includes('fixed') && !f.includes('unified'))
    .sort();

  for (const file of files) {
    const entries = loadProcessedFile(file);
    allEntries.push(...entries);
  }

  console.log(`\n📊 Total raw entries across all sources: ${allEntries.length}\n`);

  // ============================================================
  // Step 3: Merge by Juhuri term
  // ============================================================

  console.log('='.repeat(60));
  console.log('Step 2: Merging by Juhuri term');
  console.log('='.repeat(60));

  const mergedMap = new Map(); // key → merged entry
  let mergeCount = 0;
  let noKeyCount = 0;
  const noKeyEntries = []; // entries we couldn't key

  for (const entry of allEntries) {
    const key = normalizeKey(entry);

    if (!key) {
      noKeyCount++;
      // Still include entries without a key if they have useful data
      if (entry.russian || entry.hebrew) {
        noKeyEntries.push(entry);
      }
      continue;
    }

    if (mergedMap.has(key)) {
      const existing = mergedMap.get(key);
      mergedMap.set(key, mergeEntries(existing, entry));
      mergeCount++;
    } else {
      mergedMap.set(key, {
        ...entry,
        _sources: [entry._source || 'unknown'],
      });
    }
  }

  // Convert map to array
  const mergedEntries = [...mergedMap.values(), ...noKeyEntries];

  // Clean up internal fields
  const cleanEntries = mergedEntries.map(e => {
    const { _source, _sources, source_id, ...clean } = e;
    return {
      term: clean.term || '',
      latin: clean.latin || '',
      hebrew: clean.hebrew || '',
      russian: clean.russian || '',
      partOfSpeech: clean.partOfSpeech || '',
      definition: clean.definition || '',
      pronunciationGuide: clean.pronunciationGuide || '',
      dialect: clean.dialect || 'General',
      sources: _sources || [_source || 'unknown'],
    };
  });

  console.log(`\n✅ Unique entries after merge: ${cleanEntries.length}`);
  console.log(`🔀 Merges performed: ${mergeCount}`);
  console.log(`⚠️  Entries without key (kept separately): ${noKeyEntries.length}`);
  console.log(`🗑️  Entries without key (dropped): ${noKeyCount - noKeyEntries.length}`);

  // Stats by field coverage
  let withHebrew = 0, withRussian = 0, withLatin = 0, withTerm = 0, withBoth = 0;
  for (const e of cleanEntries) {
    if (e.hebrew) withHebrew++;
    if (e.russian) withRussian++;
    if (e.latin) withLatin++;
    if (e.term) withTerm++;
    if (e.hebrew && e.russian) withBoth++;
  }

  console.log('\n📊 Field coverage:');
  console.log(`   With term (Juhuri Hebrew):  ${withTerm}`);
  console.log(`   With latin:                 ${withLatin}`);
  console.log(`   With hebrew:                ${withHebrew}`);
  console.log(`   With russian:               ${withRussian}`);
  console.log(`   With BOTH hebrew+russian:   ${withBoth}`);

  // Show some merge examples
  console.log('\n📋 Sample merged entries (with multiple sources):');
  console.log('-'.repeat(60));
  let shown = 0;
  for (const e of cleanEntries) {
    if (e.sources.length > 1 && shown < 10) {
      console.log(`  ${e.term || e.latin || '?'} | heb: ${e.hebrew || '-'} | ru: ${(e.russian || '-').substring(0, 30)} | sources: ${e.sources.length}`);
      shown++;
    }
  }

  // ============================================================
  // Step 4: Save
  // ============================================================

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(PROCESSED_DIR, `dictionary-unified-${timestamp}.json`);

  const output = {
    timestamp: new Date().toISOString(),
    description: 'Unified Juhuri dictionary merged from all sources',
    sources: [
      'תרגומים מסריקות.txt (scan extractions)',
      ...files,
    ],
    total_entries: cleanEntries.length,
    field_coverage: { withTerm, withLatin, withHebrew, withRussian, withBoth },
    entries: cleanEntries,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n💾 Saved unified dictionary: ${outputPath}`);
  console.log(`   Total: ${cleanEntries.length} entries`);
}

run();
