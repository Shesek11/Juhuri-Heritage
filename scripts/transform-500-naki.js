#!/usr/bin/env node

/**
 * Transform "500 נקי.xlsx" into DictionaryEntry JSON format.
 *
 * Source columns: עברית (Hebrew meaning), תעתיק (Juhuri in Hebrew chars), הגייה (Latin pronunciation)
 * Output: DictionaryEntry[] compatible with the extractor format
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../data/raw/500 נקי.xlsx');
const OUTPUT_DIR = path.resolve(__dirname, '../data/processed');

// Read Excel
const workbook = XLSX.readFile(INPUT);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const rawData = XLSX.utils.sheet_to_json(worksheet);

console.log(`📂 Reading: ${INPUT}`);
console.log(`📊 Raw rows: ${rawData.length}\n`);

const entries = [];
const seen = new Set(); // dedup key: term+hebrew
let skipped = 0;
let duplicates = 0;
let variants = 0;

for (const row of rawData) {
  const hebrew = (row['עברית'] || '').toString().trim();
  const term = (row['תעתיק'] || '').toString().trim();
  const latin = (row['הגייה'] || '').toString().trim();

  // Skip empty rows
  if (!hebrew && !term && !latin) {
    skipped++;
    continue;
  }

  // Handle variant splitting on "/" and "\"
  const hebrewVariants = hebrew.includes('/')
    ? hebrew.split('/').map(s => s.trim()).filter(Boolean)
    : hebrew.includes('\\')
      ? hebrew.split('\\').map(s => s.trim()).filter(Boolean)
      : [hebrew];

  const termVariants = term.includes('/')
    ? term.split('/').map(s => s.trim()).filter(Boolean)
    : [term];

  const latinVariants = latin.includes('/')
    ? latin.split('/').map(s => s.trim()).filter(Boolean)
    : [latin];

  const maxVariants = Math.max(termVariants.length, latinVariants.length);
  if (maxVariants > 1) variants += maxVariants - 1;

  for (let i = 0; i < maxVariants; i++) {
    const entryTerm = termVariants[Math.min(i, termVariants.length - 1)];
    const entryLatin = latinVariants[Math.min(i, latinVariants.length - 1)];
    const entryHebrew = hebrewVariants.length > 1
      ? hebrewVariants[Math.min(i, hebrewVariants.length - 1)]
      : hebrew;

    // Skip if no meaningful data
    if (!entryTerm && !entryLatin && !entryHebrew) {
      skipped++;
      continue;
    }

    // Dedup
    const dedupKey = `${entryTerm}|${entryHebrew}`.toLowerCase();
    if (seen.has(dedupKey)) {
      duplicates++;
      continue;
    }
    seen.add(dedupKey);

    // Clean up pronunciation - add syllable hyphens for multi-syllable words
    let pronunciation = entryLatin.toLowerCase().replace(/\s+/g, ' ').trim();

    entries.push({
      term: entryTerm,
      latin: entryLatin,
      hebrew: entryHebrew.replace(/[.!]+$/, '').trim(),
      russian: '',
      partOfSpeech: '',
      definition: entryHebrew.replace(/[.!]+$/, '').trim(),
      pronunciationGuide: pronunciation,
      dialect: 'General'
    });
  }
}

console.log('=' .repeat(60));
console.log('📊 PROCESSING SUMMARY');
console.log('='.repeat(60));
console.log(`📥 Raw rows:          ${rawData.length}`);
console.log(`✅ Entries extracted:  ${entries.length}`);
console.log(`🔀 Variants split:    ${variants}`);
console.log(`🗑️  Duplicates removed: ${duplicates}`);
console.log(`⏭️  Skipped (empty):   ${skipped}`);
console.log('');

// Show samples
console.log('📋 Sample entries:');
console.log('-'.repeat(60));
for (let i = 0; i < Math.min(10, entries.length); i++) {
  const e = entries[i];
  console.log(`  ${e.hebrew} → ${e.term || '(empty)'} [${e.latin || e.pronunciationGuide || 'no latin'}]`);
}
console.log(`  ... and ${entries.length - 10} more`);
console.log('');

// Save output
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputPath = path.join(OUTPUT_DIR, `dictionary-extract-${timestamp}.json`);

const output = {
  timestamp: new Date().toISOString(),
  source_files: ['500 נקי.xlsx'],
  total_entries: entries.length,
  entries: entries
};

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

console.log(`💾 Saved to: ${outputPath}`);
console.log('');
console.log('Next step:');
console.log(`  node scripts/import-to-database.js "${outputPath}"`);
