#!/usr/bin/env node

/**
 * Extract dictionary entries from Naftalijev's Juhuri-Russian Dictionary PDF.
 * (22dfd6a22a1d1820a157798263eeddb6.pdf - 566 pages, 14,000+ words)
 *
 * Entry format: UPPERCASE_JUHURI_LATIN part_of_speech. Russian translation...
 * Example: ABAÇUR сущ. абажур (колпак для лампы, светильника).
 */

const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../data/raw/22dfd6a22a1d1820a157798263eeddb6.pdf');
const OUTPUT_DIR = path.resolve(__dirname, '../data/processed');

// Part of speech mapping: Russian abbreviation → English
const POS_MAP = {
  'сущ': 'noun',
  'прил': 'adj',
  'гл': 'verb',
  'нареч': 'adv',
  'числ': 'num',
  'числит': 'num',
  'мест': 'pron',
  'предл': 'prep',
  'союз': 'conj',
  'межд': 'interj',
  'част': 'particle',
  'вводн': 'parenthetical',
};

// Juhuri Latin → Hebrew transliteration table
const TRANSLIT_MAP = {
  'a': 'אַ', 'b': 'בּ', 'c': "ג'", 'ç': "צ'", 'd': 'ד',
  'e': 'א', 'ə': 'אֶ', 'f': 'פ', 'g': 'ג', 'ğ': 'ע',
  'h': 'ה', 'ħ': 'ח', 'ⱨ': 'ח', 'x': 'ח', 'i': 'י',
  'İ': 'אִי', 'j': "ז'", 'k': 'כּ', 'q': 'ק', 'l': 'ל',
  'm': 'מ', 'n': 'נ', 'o': 'וֹ', 'ö': 'אוֹ', 'p': 'פּ',
  'r': 'ר', 's': 'ס', 'ş': 'ש', 't': 'ט', 'u': 'וּ',
  'ü': 'אוּ', 'v': 'ו', 'y': 'י', 'z': 'ז',
};

function transliterate(latin) {
  if (!latin) return '';
  let result = '';
  const lower = latin.toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    const ch = lower[i];
    if (TRANSLIT_MAP[ch]) {
      result += TRANSLIT_MAP[ch];
    } else if (ch === ' ' || ch === '-') {
      result += ch === ' ' ? ' ' : '-';
    }
    // skip unknown chars
  }
  return result;
}

function syllabify(latin) {
  // Simple syllabification: insert hyphens between consonant clusters
  if (!latin || latin.length <= 3) return latin.toLowerCase();
  return latin.toLowerCase();
}

// Regex to match dictionary entries:
// Starts with UPPERCASE Juhuri Latin word (min 2 chars), optional Roman numeral, then part of speech
const ENTRY_RE = /^([A-ZƏÇŞĞĦⱧİÖÜ][A-ZƏÇŞĞĦⱧİÖÜ\-']{1,}(?:\d)?)\s+(?:I{1,3}V?\s+)?(сущ|прил|гл|нареч|числ|числит|мест|предл|союз|межд|част|вводн)\.\s*(.+)/;

// Detect page marker
const PAGE_RE = /^-- \d+ of 566 --$/;

async function run() {
  console.log(`📂 Reading: ${INPUT}`);

  const buf = fs.readFileSync(INPUT);
  const uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  const p = new PDFParse(uint8);
  const result = await p.getText();

  console.log(`📊 Text length: ${result.text.length} chars`);

  const lines = result.text.split('\n');
  const entries = [];
  const seen = new Set();
  let currentEntry = null;
  let inDictionary = false;
  let skippedPages = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect page markers - use them to trigger dictionary start, then skip
    if (PAGE_RE.test(line)) {
      if (line.includes('19 of 566') || line.includes('20 of 566')) {
        inDictionary = true;
      }
      continue;
    }

    // Skip page numbers (single numbers on a line)
    if (/^\d+$/.test(line)) continue;

    if (!inDictionary) continue;

    // Try to match a new entry
    const match = line.match(ENTRY_RE);

    if (match) {
      const latin = match[1];

      // Skip false matches like "II", "III" (Roman numerals as standalone entries)
      if (/^I{1,4}V?$/.test(latin)) {
        // This is a secondary sense (II прил., III нареч.), append to current entry
        if (currentEntry) {
          currentEntry.russianParts.push(line);
        }
        continue;
      }

      // Save previous entry if exists
      if (currentEntry) {
        finishEntry(currentEntry, entries, seen);
      }

      const posRu = match[2];
      const russianDef = match[3];

      currentEntry = {
        latin: latin,
        pos: POS_MAP[posRu] || posRu,
        russianParts: [russianDef],
      };
    } else if (currentEntry) {
      // Check if this line starts a new section (like "A", "B" letter headers)
      if (/^[A-ZƏÇŞĞĦⱧİÖÜ]$/.test(line)) continue;

      // Check if it looks like a column header (e.g., "AEROBAZA    ALBANİ    22")
      if (/^[A-ZƏÇŞĞĦⱧİÖÜ]+\s+[A-ZƏÇŞĞĦⱧİÖÜ]+\s+\d+$/.test(line)) continue;

      // Continuation of current entry
      currentEntry.russianParts.push(line);
    }
  }

  // Don't forget the last entry
  if (currentEntry) {
    finishEntry(currentEntry, entries, seen);
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('📊 EXTRACTION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Entries extracted: ${entries.length}`);
  console.log(`🗑️  Duplicates skipped: ${seen.size - entries.length > 0 ? seen.size - entries.length : 0}`);
  console.log('');

  // Show samples
  console.log('📋 Sample entries:');
  console.log('-'.repeat(60));
  for (let i = 0; i < Math.min(15, entries.length); i++) {
    const e = entries[i];
    console.log(`  ${e.latin} (${e.partOfSpeech}) → ${e.russian.substring(0, 60)}`);
  }
  console.log(`  ... and ${Math.max(0, entries.length - 15)} more`);

  // Save
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(OUTPUT_DIR, `dictionary-naftalijev-${timestamp}.json`);

  const output = {
    timestamp: new Date().toISOString(),
    source_files: ['22dfd6a22a1d1820a157798263eeddb6.pdf'],
    source_name: 'Naftalijev Juhuri-Russian Dictionary (2016)',
    total_entries: entries.length,
    entries,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n💾 Saved to: ${outputPath}`);
}

function finishEntry(entry, entries, seen) {
  const fullRussian = entry.russianParts.join(' ').trim();

  // Extract first Russian meaning (before semicolons or numbered senses)
  let primaryMeaning = fullRussian;

  // Remove example sentences (typically after a period and Juhuri word)
  // Look for first meaningful Russian translation
  const firstSense = fullRussian.match(/^(?:\d\.\s*)?([^;.]+)/);
  if (firstSense) {
    primaryMeaning = firstSense[1].trim();
  }

  // Remove parenthetical explanations for a cleaner meaning
  const cleanMeaning = primaryMeaning.replace(/\s*\([^)]+\)\s*/g, ' ').trim();

  const latin = entry.latin;
  const dedupKey = latin.toLowerCase();

  if (seen.has(dedupKey)) return;
  seen.add(dedupKey);

  entries.push({
    term: transliterate(latin),
    latin: latin,
    hebrew: '', // Russian→Hebrew would need AI, leaving empty for now
    russian: cleanMeaning,
    partOfSpeech: entry.pos,
    definition: primaryMeaning,
    pronunciationGuide: syllabify(latin),
    dialect: 'General',
  });
}

run().catch(e => console.error('Fatal:', e));
