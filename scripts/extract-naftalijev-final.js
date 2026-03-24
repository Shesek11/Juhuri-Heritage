#!/usr/bin/env node

/**
 * Extract Naftalijev dictionary from pre-extracted raw text.
 * Handles quirks: spaces inside words, multi-sense entries, etc.
 * No child_process, no AI — pure regex parsing of known dictionary format.
 */

const fs = require('fs');
const path = require('path');

const RAW_TEXT = path.resolve(__dirname, '../data/raw/סטמגי/naftalijev-raw-text.txt');
const OUTPUT_DIR = path.resolve(__dirname, '../data/processed');

const src = { source: 'מאגר', sourceName: 'סטמגי' };
const base = { term: '', cyrillic: '', hebrew: '', english: '', definition: '', pronunciationGuide: '', dialect: '', ...src };

const POS_MAP = {
  'сущ': 'noun', 'прил': 'adj', 'гл': 'verb', 'нареч': 'adv',
  'глаг': 'verb', 'числ': 'num', 'числит': 'num', 'мест': 'pron', 'предл': 'prep',
  'послел': 'postposition', 'союз': 'conj', 'межд': 'interj', 'част': 'particle',
  'вводн': 'parenthetical', 'предик': 'predicative', 'повел': 'imperative',
  'в сочет': '', 'в знач': '',
};

function mapPos(p) { return POS_MAP[p] || p; }

console.log('Reading raw text...');
const text = fs.readFileSync(RAW_TEXT, 'utf-8');
console.log('Length: ' + text.length + ' chars\n');

// Find all entry start positions
// UPPERCASE Juhuri word (may have spaces between chars from PDF extraction)
// followed by optional number, optional roman numeral, then POS abbreviation
const entryRe = /([A-ZƏÇŞĞĦⱧ\u0130ÖÜ][A-ZƏÇŞĞĦⱧ\u0130ÖÜ \-']{1,40}?)\s+(?:\d\s+)?(?:I{0,3}V?\s+)?(сущ|прил|глаг|гл|нареч|числ|числит|мест|предл|послел|союз|межд|част|вводн|предик|повел|в сочет|в знач)\.\s*/g;

const matches = [];
let m;
while ((m = entryRe.exec(text)) !== null) {
  const rawWord = m[1].trim();
  const word = rawWord.replace(/\s+/g, '');

  if (word.length < 2) continue;
  if (/^I{1,4}V?$/.test(word)) continue;

  matches.push({
    latin: word,
    pos: mapPos(m[2]),
    matchEnd: m.index + m[0].length,
    matchStart: m.index,
  });
}

console.log('Found ' + matches.length + ' entry headers');

// Extract Russian text between entries
const entries = [];
const seen = new Set();

for (let i = 0; i < matches.length; i++) {
  const entry = matches[i];
  const nextStart = (i + 1 < matches.length) ? matches[i + 1].matchStart : text.length;

  let russian = text.substring(entry.matchEnd, nextStart).trim();
  russian = russian.replace(/\s+/g, ' ').replace(/\s*\d+\s*$/, '').trim();

  if (!russian || russian.length < 2) continue;
  if (russian.length > 500) russian = russian.substring(0, 500);

  const key = entry.latin.toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);

  entries.push({ ...base, latin: entry.latin, russian, partOfSpeech: entry.pos });
}

console.log('Unique entries: ' + entries.length + '\n');

// Stats
const posStats = {};
for (const e of entries) {
  posStats[e.partOfSpeech] = (posStats[e.partOfSpeech] || 0) + 1;
}
console.log('By part of speech:');
for (const [pos, count] of Object.entries(posStats).sort((a, b) => b[1] - a[1])) {
  console.log('  ' + pos + ': ' + count);
}

console.log('\nFirst 15 entries:');
for (let i = 0; i < Math.min(15, entries.length); i++) {
  const e = entries[i];
  console.log('  ' + e.latin + ' (' + e.partOfSpeech + ') -> ' + e.russian.substring(0, 70));
}

// Save
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputPath = path.join(OUTPUT_DIR, 'dictionary-naftalijev-' + timestamp + '.json');

const result = {
  timestamp: new Date().toISOString(),
  source_files: ['22dfd6a22a1d1820a157798263eeddb6.pdf'],
  ...src,
  total_entries: entries.length,
  entries,
};

fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
console.log('\nSaved to: ' + outputPath);
