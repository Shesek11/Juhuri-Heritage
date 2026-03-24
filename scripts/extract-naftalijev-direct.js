#!/usr/bin/env node

/**
 * Extract Naftalijev dictionary using pdfjs-dist directly.
 * No AI needed — the dictionary has a consistent format:
 * UPPERCASE_LATIN pos. Russian meaning
 */

const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../data/raw/סטמגי/22dfd6a22a1d1820a157798263eeddb6.pdf');
const OUTPUT_DIR = path.resolve(__dirname, '../data/processed');

const src = { source: 'מאגר', sourceName: 'סטמגי' };
const base = { term: '', cyrillic: '', hebrew: '', english: '', definition: '', pronunciationGuide: '', dialect: '', ...src };

const POS_MAP = {
  'сущ': 'noun', 'прил': 'adj', 'гл': 'verb', 'нареч': 'adv',
  'числ': 'num', 'числит': 'num', 'мест': 'pron', 'предл': 'prep',
  'союз': 'conj', 'межд': 'interj', 'част': 'particle', 'вводн': 'parenthetical',
};

function mapPos(ruPos) {
  if (!ruPos) return '';
  return POS_MAP[ruPos] || ruPos;
}

// Entry regex: starts with UPPERCASE Latin Juhuri word, optional roman numeral, then POS
const ENTRY_RE = /^([A-ZƏÇŞĞĦⱧİÖÜ][A-ZƏÇŞĞĦⱧİÖÜa-zəçşğħⱨiöü\-']+(?:\d)?)\s+(?:(I{1,3}V?)\s+)?(сущ|прил|гл|нареч|числ|числит|мест|предл|союз|межд|част|вводн)\.\s*(.*)/;

async function run() {
  console.log('📚 Extracting Naftalijev Dictionary (direct PDF parsing)...\n');

  // Dynamic import for ESM module
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const data = new Uint8Array(fs.readFileSync(INPUT));
  const doc = await pdfjsLib.getDocument({ data }).promise;

  console.log(`Pages: ${doc.numPages}`);

  // Extract text from all pages
  let fullText = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';

    if (i % 50 === 0) {
      console.log(`  Extracted text from ${i}/${doc.numPages} pages...`);
    }
  }

  console.log(`  Extracted text from all ${doc.numPages} pages`);
  console.log(`  Total text length: ${fullText.length} chars\n`);

  // Save raw text for debugging
  const rawPath = path.join(OUTPUT_DIR, '../raw/סטמגי/naftalijev-raw-text.txt');
  fs.writeFileSync(rawPath, fullText, 'utf-8');
  console.log(`  Raw text saved to: naftalijev-raw-text.txt\n`);

  // The text flows continuously. Split at entry boundaries using regex.
  const entries = [];
  const seen = new Set();

  const entryPattern = /\b([A-Z\u018e\u00c7\u015e\u011e\u0126\u2c67\u0130\u00d6\u00dc][A-Z\u018e\u00c7\u015e\u011e\u0126\u2c67\u0130\u00d6\u00dc\-']{1,})\s+(?:(I{1,3}V?)\s+)?(сущ|прил|гл|нареч|числ|числит|мест|предл|союз|межд|част|вводн)\.\s*/g;

  const matches = [];
  let m;
  while ((m = entryPattern.exec(fullText)) !== null) {
    matches.push({
      latin: m[1],
      pos: mapPos(m[3]),
      index: m.index,
      endIndex: m.index + m[0].length,
    });
  }

  console.log('  Found ' + matches.length + ' entry headers\n');

  for (let i = 0; i < matches.length; i++) {
    const entry = matches[i];
    const russianEnd = (i + 1 < matches.length) ? matches[i + 1].index : fullText.length;
    let russian = fullText.substring(entry.endIndex, russianEnd).trim();
    russian = russian.replace(/\s+/g, ' ').replace(/\s*\d+\s*$/, '').trim();

    if (/^I{1,4}V?$/.test(entry.latin)) continue;
    if (entry.latin.length < 2) continue;

    const key = entry.latin.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    if (russian) {
      entries.push({
        ...base,
        latin: entry.latin,
        russian: russian.substring(0, 500),
        partOfSpeech: entry.pos,
      });
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Total unique entries: ${entries.length}`);
  console.log(`${'='.repeat(60)}\n`);

  // Samples
  console.log('Samples:');
  for (let i = 0; i < Math.min(10, entries.length); i++) {
    const e = entries[i];
    console.log(`  ${e.latin} (${e.partOfSpeech}) → ${e.russian.substring(0, 60)}`);
  }

  // Save
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(OUTPUT_DIR, `dictionary-naftalijev-${timestamp}.json`);

  const result = {
    timestamp: new Date().toISOString(),
    source_files: ['22dfd6a22a1d1820a157798263eeddb6.pdf'],
    ...src,
    total_entries: entries.length,
    entries,
  };

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`\n💾 Saved to: ${outputPath}`);
}

function finishEntry(entry, entries, seen) {
  const russian = entry.russian.trim()
    // Clean up extra spaces
    .replace(/\s+/g, ' ')
    // Remove trailing page artifacts
    .replace(/\s*\d+\s*$/, '');

  if (!russian) return;

  const key = entry.latin.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);

  entries.push({
    ...base,
    latin: entry.latin,
    russian: russian,
    partOfSpeech: entry.pos,
  });
}

run().catch(e => {
  console.error('Fatal:', e.message);
  console.error(e.stack);
  process.exit(1);
});
