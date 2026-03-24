#!/usr/bin/env node

/**
 * Extract Naftalijev dictionary by sending raw text chunks to Gemini API.
 * The raw text was already extracted from the PDF by pdfjs-dist.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDXDr55Vm3SkPT28myWeaGvljI1KoXgfrc';
const MODEL = 'gemini-2.5-flash';
const RAW_TEXT = path.resolve(__dirname, '../data/raw/סטמגי/naftalijev-raw-text.txt');
const OUTPUT_DIR = path.resolve(__dirname, '../data/processed');
const CHUNK_SIZE = 80000; // ~80K chars per chunk

const src = { source: 'מאגר', sourceName: 'סטמגי' };
const base = { term: '', cyrillic: '', hebrew: '', english: '', definition: '', pronunciationGuide: '', dialect: '', ...src };

const POS_MAP = {
  'сущ': 'noun', 'прил': 'adj', 'гл': 'verb', 'нареч': 'adv',
  'числ': 'num', 'мест': 'pron', 'предл': 'prep',
  'союз': 'conj', 'межд': 'interj', 'част': 'particle',
};

function mapPos(ruPos) {
  if (!ruPos) return '';
  const key = ruPos.replace(/\.$/, '').trim().toLowerCase();
  return POS_MAP[key] || ruPos;
}

function callGemini(text, prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt + '\n\n---TEXT START---\n' + text + '\n---TEXT END---' }] }],
      generationConfig: { maxOutputTokens: 65536, temperature: 0.0 },
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: '/v1beta/models/' + MODEL + ':generateContent?key=' + API_KEY,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) { reject(new Error(json.error.message)); return; }
          resolve(json.candidates?.[0]?.content?.parts?.[0]?.text || '');
        } catch (e) { reject(new Error('Parse error: ' + data.substring(0, 200))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const PROMPT = `You are parsing a Juhuri-Russian dictionary. The text below contains dictionary entries in this format:
UPPERCASE_JUHURI_WORD part_of_speech. Russian translation and explanation.

For example:
ABAÇUR сущ. абажур (колпак для лампы, светильника).

Extract EVERY dictionary entry you find. Output ONLY in this format, one per line:
JUHURI_WORD | PART_OF_SPEECH | RUSSIAN_MEANING

Rules:
- The Juhuri word is in UPPERCASE Latin script (may contain special chars like Ə, Ç, Ş, Ğ, İ, Ö, Ü, Ħ, ⱨ)
- Part of speech abbreviations: сущ., прил., гл., нареч., числ., мест., предл., союз, межд., част.
- Russian meaning is everything after the POS until the next entry
- Skip introductory text, page numbers, headers
- Some entries have multiple senses (I сущ., II прил.) — include them as one entry
- Do NOT skip any entries. Extract ALL of them.
- Do NOT add numbering — just the pipe-separated format`;

async function run() {
  console.log('Reading raw text...');
  const fullText = fs.readFileSync(RAW_TEXT, 'utf-8');
  console.log('Text length: ' + fullText.length + ' chars');

  // Split into chunks
  const chunks = [];
  for (let i = 0; i < fullText.length; i += CHUNK_SIZE) {
    // Find a good break point (after a period+space or end of entry)
    let end = Math.min(i + CHUNK_SIZE, fullText.length);
    if (end < fullText.length) {
      // Try to break at a space near the chunk boundary
      const lastSpace = fullText.lastIndexOf('  ', end);
      if (lastSpace > i + CHUNK_SIZE * 0.8) end = lastSpace;
    }
    chunks.push(fullText.substring(i, end));
  }

  console.log('Split into ' + chunks.length + ' chunks\n');

  const allEntries = [];
  const seen = new Set();

  for (let i = 0; i < chunks.length; i++) {
    console.log('[' + (i + 1) + '/' + chunks.length + '] Processing chunk (' + chunks[i].length + ' chars)...');

    try {
      const result = await callGemini(chunks[i], PROMPT);
      const lines = result.split('\n');
      let chunkCount = 0;

      for (const line of lines) {
        const match = line.match(/^(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)/);
        if (!match) continue;

        const latin = match[1].trim();
        const pos = match[2].trim();
        const russian = match[3].trim();

        if (!latin || !russian) continue;
        if (latin.length < 2) continue;

        const key = latin.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        allEntries.push({
          ...base,
          latin,
          russian: russian.substring(0, 500),
          partOfSpeech: mapPos(pos),
        });
        chunkCount++;
      }

      console.log('   +' + chunkCount + ' new entries (total: ' + allEntries.length + ')');
    } catch (err) {
      console.error('   Error: ' + err.message);
    }

    if (i + 1 < chunks.length) await sleep(1500);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Total unique entries: ' + allEntries.length);

  // Save
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(OUTPUT_DIR, 'dictionary-naftalijev-' + timestamp + '.json');

  const result = {
    timestamp: new Date().toISOString(),
    source_files: ['22dfd6a22a1d1820a157798263eeddb6.pdf'],
    ...src,
    total_entries: allEntries.length,
    entries: allEntries,
  };

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log('Saved to: ' + outputPath);
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
