#!/usr/bin/env node

/**
 * Extract Naftalijev dictionary entries using Gemini API directly.
 * Uploads PDF and processes in letter-based batches.
 *
 * Usage: node extract-naftalijev-api.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDXDr55Vm3SkPT28myWeaGvljI1KoXgfrc';
const MODEL = 'gemini-2.5-flash';
const INPUT = path.resolve(__dirname, '../data/raw/סטמגי/22dfd6a22a1d1820a157798263eeddb6.pdf');
const OUTPUT_DIR = path.resolve(__dirname, '../data/processed');

const src = { source: 'מאגר', sourceName: 'סטמגי' };
const base = { term: '', cyrillic: '', hebrew: '', english: '', definition: '', pronunciationGuide: '', dialect: '', ...src };

const POS_MAP = {
  'сущ': 'noun', 'прил': 'adj', 'гл': 'verb', 'нареч': 'adv',
  'числ': 'num', 'числит': 'num', 'мест': 'pron', 'предл': 'prep',
  'союз': 'conj', 'межд': 'interj', 'част': 'particle',
};

function mapPos(ruPos) {
  if (!ruPos) return '';
  const key = ruPos.replace(/\.$/, '').trim().toLowerCase();
  return POS_MAP[key] || ruPos;
}

function callGeminiAPI(base64PDF, prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{
        parts: [
          {
            inline_data: {
              mime_type: 'application/pdf',
              data: base64PDF,
            }
          },
          { text: prompt }
        ]
      }],
      generationConfig: {
        maxOutputTokens: 65536,
        temperature: 0.1,
      }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(json.error.message));
            return;
          }
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
          resolve(text);
        } catch (e) {
          reject(new Error('Failed to parse response: ' + data.substring(0, 200)));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function parseEntries(text) {
  const lines = text.split('\n');
  const entries = [];

  for (const line of lines) {
    // Match: NUMBER. JUHURI | POS | RUSSIAN
    const match = line.match(/^\d+\.\s*\*?\*?(.+?)\*?\*?\s*\|\s*(.+?)\s*\|\s*(.+)/);
    if (!match) continue;

    const latin = match[1].replace(/\*\*/g, '').trim();
    const posRu = match[2].replace(/\*\*/g, '').trim();
    const russian = match[3].replace(/\*\*/g, '').trim();

    if (!latin || !russian) continue;

    entries.push({
      ...base,
      latin,
      russian,
      partOfSpeech: mapPos(posRu),
    });
  }

  return entries;
}

const LETTERS = [
  'A', 'B', 'C', 'Ç', 'D', 'E', 'Ə', 'F', 'G', 'Ğ',
  'H', 'Ħ', 'I', 'İ', 'J', 'K', 'L', 'M', 'N', 'O',
  'Ö', 'P', 'Q', 'R', 'S', 'Ş', 'T', 'U', 'Ü', 'V',
  'X', 'Y', 'Z',
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('📚 Extracting Naftalijev Dictionary via Gemini API...\n');
  console.log(`Reading PDF: ${INPUT}`);

  const pdfBuffer = fs.readFileSync(INPUT);
  const base64PDF = pdfBuffer.toString('base64');
  console.log(`PDF size: ${Math.round(pdfBuffer.length / 1024 / 1024)}MB, base64: ${Math.round(base64PDF.length / 1024 / 1024)}MB\n`);

  const allEntries = [];
  const seen = new Set();

  // Process all letters in batches
  for (let i = 0; i < LETTERS.length; i += 3) {
    const batch = LETTERS.slice(i, i + 3);
    const letterRange = batch.join(', ');

    console.log(`[${i / 3 + 1}/${Math.ceil(LETTERS.length / 3)}] Extracting letters: ${letterRange}...`);

    const prompt = `This is a Juhuri-Russian dictionary by Naftalijev. Extract ALL dictionary entries for words starting with letters: ${letterRange}.

Each entry starts with an UPPERCASE Juhuri word in Latin script, followed by a part of speech (сущ., прил., гл., нареч., числ., мест., предл., союз, межд., част.), then Russian meaning.

Format EXACTLY as:
NUMBER. JUHURI_WORD | PART_OF_SPEECH | RUSSIAN_MEANING

Extract EVERY entry for these letters. Do not skip any.`;

    try {
      const text = await callGeminiAPI(base64PDF, prompt);
      const entries = parseEntries(text);

      let added = 0;
      for (const e of entries) {
        const key = e.latin.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          allEntries.push(e);
          added++;
        }
      }

      console.log(`   Found ${entries.length} entries, ${added} new (total: ${allEntries.length})`);
    } catch (err) {
      console.error(`   Error: ${err.message}`);
    }

    // Rate limit - wait between batches
    if (i + 3 < LETTERS.length) {
      await sleep(2000);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Total unique entries: ${allEntries.length}`);

  // Save
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(OUTPUT_DIR, `dictionary-naftalijev-${timestamp}.json`);

  const result = {
    timestamp: new Date().toISOString(),
    source_files: ['22dfd6a22a1d1820a157798263eeddb6.pdf'],
    ...src,
    total_entries: allEntries.length,
    entries: allEntries,
  };

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`💾 Saved to: ${outputPath}`);
}

run().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
