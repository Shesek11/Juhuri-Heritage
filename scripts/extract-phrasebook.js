#!/usr/bin/env node

/**
 * Extract phrases from Gilyádov & Avshalumova's Russian-Tat Phrasebook.
 * (bb58e76211b0ac0f47860085d6d5b370.pdf - 46 pages)
 *
 * Format: Two-column layout - Russian on left, Juhuri (Tat Cyrillic) on right.
 * OCR quality is poor, so we focus on section headers and clearly readable pairs.
 */

const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../data/raw/bb58e76211b0ac0f47860085d6d5b370.pdf');
const OUTPUT_DIR = path.resolve(__dirname, '../data/processed');

async function run() {
  console.log(`📂 Reading: ${INPUT}`);

  const buf = fs.readFileSync(INPUT);
  const uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  const p = new PDFParse(uint8);
  const result = await p.getText();

  const text = result.text;
  console.log(`📊 Text length: ${text.length} chars\n`);

  // The phrasebook has very poor OCR. Let's extract what we can.
  // The structure is: thematic sections with Russian-Juhuri phrase pairs.
  // Due to OCR quality, we'll look for the vocabulary/dictionary section
  // at the back of the book which tends to be cleaner.

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const entries = [];
  const seen = new Set();
  let currentSection = '';

  // Look for vocabulary list at the back (usually cleaner)
  // Also look for clearly formatted pairs
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect section headers (ALL CAPS Russian)
    if (/^[А-ЯЁ\s,]{5,}$/.test(line) && !line.match(/^\d/)) {
      currentSection = line.trim();
      continue;
    }

    // Try to find word pairs in the glossary sections
    // Pattern: "Russian word - Juhuri word" or tab-separated
    const dashMatch = line.match(/^([А-Яа-яёЁ][а-яёА-ЯЁ\s]+)\s*[-–—]\s*([а-яёА-ЯЁəüħⱨңқҝҹ][а-яёА-ЯЁəüħⱨңқҝҹ\s\-']+)$/);
    if (dashMatch) {
      const russian = dashMatch[1].trim();
      const juhuri = dashMatch[2].trim();
      if (russian.length > 1 && juhuri.length > 1) {
        addEntry(entries, seen, russian, juhuri, currentSection);
      }
    }
  }

  // If very few entries found from text parsing, note the OCR limitation
  console.log('='.repeat(60));
  console.log('📊 EXTRACTION SUMMARY (Phrasebook)');
  console.log('='.repeat(60));
  console.log(`✅ Entries extracted: ${entries.length}`);

  if (entries.length < 10) {
    console.log('');
    console.log('⚠️  OCR quality is very poor for this document.');
    console.log('   The phrasebook uses a two-column layout that pdf-parse');
    console.log('   cannot reliably separate. Consider using Gemini Vision');
    console.log('   or manual entry for better results.');
  }

  if (entries.length > 0) {
    console.log('');
    console.log('📋 Entries:');
    for (const e of entries.slice(0, 20)) {
      console.log(`  ${e.russian} → ${e.definition || '?'}`);
    }
    if (entries.length > 20) {
      console.log(`  ... and ${entries.length - 20} more`);
    }
  }

  // Save
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(OUTPUT_DIR, `dictionary-phrasebook-${timestamp}.json`);

  const output = {
    timestamp: new Date().toISOString(),
    source_files: ['bb58e76211b0ac0f47860085d6d5b370.pdf'],
    source_name: 'Gilyádov & Avshalumova Russian-Tat Phrasebook (1995)',
    total_entries: entries.length,
    entries,
    notes: entries.length < 10
      ? 'OCR quality too poor for reliable extraction. Manual processing recommended.'
      : '',
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n💾 Saved to: ${outputPath}`);
}

function addEntry(entries, seen, russian, juhuri_cyr, section) {
  const key = russian.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  entries.push({
    term: '',
    latin: '',
    hebrew: '',
    russian,
    partOfSpeech: '',
    definition: juhuri_cyr,
    pronunciationGuide: '',
    dialect: 'General',
  });
}

run().catch(e => console.error('Fatal:', e));
