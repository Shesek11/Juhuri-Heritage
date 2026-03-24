#!/usr/bin/env node

/**
 * Parse Gemini output of Naftalijev dictionary into JSON.
 *
 * Usage:
 * 1. First run Gemini manually to extract entries
 * 2. Then: node extract-naftalijev-gemini.js <gemini-output-file>
 *
 * Rules: No AI-generated fields — faithful to source only
 */

const fs = require('fs');
const path = require('path');

const src = { source: 'מאגר', sourceName: 'סטמגי' };
const base = { term: '', cyrillic: '', hebrew: '', english: '', definition: '', pronunciationGuide: '', dialect: '', ...src };

const POS_MAP = {
  'сущ': 'noun', 'прил': 'adj', 'гл': 'verb', 'нареч': 'adv',
  'числ': 'num', 'числит': 'num', 'мест': 'pron', 'предл': 'prep',
  'союз': 'conj', 'межд': 'interj', 'част': 'particle',
};

function mapPos(ruPos) {
  if (!ruPos) return '';
  const key = ruPos.replace(/\.$/, '').trim();
  return POS_MAP[key] || key;
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node extract-naftalijev-gemini.js <gemini-output-file>');
  process.exit(1);
}

const text = fs.readFileSync(inputPath, 'utf-8');
const lines = text.split('\n');
const entries = [];
const seen = new Set();

for (const line of lines) {
  // Match: NUMBER. JUHURI | POS | RUSSIAN
  const match = line.match(/^\d+\.\s*\*?\*?(.+?)\*?\*?\s*\|\s*(.+?)\s*\|\s*(.+)/);
  if (!match) continue;

  const latin = match[1].trim();
  const posRu = match[2].trim();
  const russian = match[3].trim();

  if (!latin || !russian) continue;

  const key = latin.toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);

  entries.push({
    ...base,
    latin: latin,
    russian: russian,
    partOfSpeech: mapPos(posRu),
  });
}

const OUTPUT_DIR = path.resolve(__dirname, '../data/processed');
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
console.log(`${entries.length} entries saved to ${outputPath}`);
