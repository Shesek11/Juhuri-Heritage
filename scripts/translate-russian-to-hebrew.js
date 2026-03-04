#!/usr/bin/env node

/**
 * Translate Russian definitions to Hebrew for entries missing Hebrew.
 * Uses Gemini API in batches for efficiency.
 *
 * Input:  data/processed/dictionary-unified-all-sources.json
 * Output: data/processed/dictionary-unified-with-hebrew.json
 *
 * Progress is saved periodically so the script can be resumed if interrupted.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../data/processed/dictionary-unified-all-sources.json');
const OUTPUT = path.resolve(__dirname, '../data/processed/dictionary-unified-with-hebrew.json');
const PROGRESS_FILE = path.resolve(__dirname, '../data/processed/.translate-progress.json');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in .env');
  process.exit(1);
}

const GEMINI_MODEL = 'gemini-2.0-flash';
const BATCH_SIZE = 50; // words per API call (smaller to avoid mismatches)
const DELAY_MS = 4000; // delay between batches (respect rate limits)
const SAVE_EVERY = 3; // save progress every N batches

async function callGemini(words) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `Translate the following Russian words/phrases to Hebrew.
Return ONLY a JSON array of strings with the Hebrew translations, in the same order.
Keep translations concise (1-3 words). If a word is already a loanword in Hebrew, transliterate it.
Do not add explanations.

Words to translate:
${JSON.stringify(words)}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 429) {
      throw new Error('RATE_LIMIT');
    }
    throw new Error(`HTTP ${response.status}: ${errText.substring(0, 200)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Empty response from Gemini');
  }

  try {
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '');
    if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '').replace(/```$/, '');
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`JSON parse error: ${e.message}`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    } catch (e) {}
  }
  return { completedBatches: 0, translations: {} };
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress), 'utf-8');
}

async function run() {
  console.log('🌐 Russian → Hebrew Translation\n');

  const dict = JSON.parse(fs.readFileSync(INPUT, 'utf-8'));
  const entries = dict.entries;

  // Load progress and apply already-completed translations FIRST
  const progress = loadProgress();
  const alreadyTranslated = Object.keys(progress.translations).length;

  for (const [idx, heb] of Object.entries(progress.translations)) {
    entries[parseInt(idx)].hebrew = heb;
    if (!entries[parseInt(idx)].definition || entries[parseInt(idx)].definition === entries[parseInt(idx)].russian) {
      entries[parseInt(idx)].definition = heb;
    }
  }

  // Now find entries STILL needing translation (excludes already-done from progress)
  const needTranslation = [];
  const indexMap = []; // maps needTranslation index → entries index

  for (let i = 0; i < entries.length; i++) {
    if (entries[i].russian && !entries[i].hebrew) {
      needTranslation.push(entries[i].russian);
      indexMap.push(i);
    }
  }

  console.log(`📊 Total entries: ${entries.length}`);
  console.log(`✅ Already translated (from progress): ${alreadyTranslated}`);
  console.log(`🔄 Still need translation: ${needTranslation.length}`);
  console.log(`✅ Already have Hebrew: ${entries.length - needTranslation.length}\n`);

  // Create batches from remaining entries only
  const batches = [];
  for (let i = 0; i < needTranslation.length; i += BATCH_SIZE) {
    batches.push({
      words: needTranslation.slice(i, i + BATCH_SIZE),
      indices: indexMap.slice(i, i + BATCH_SIZE),
    });
  }

  console.log(`📦 Batches remaining: ${batches.length} (${BATCH_SIZE} words each)\n`);

  let translated = alreadyTranslated;
  let errors = 0;
  let rateLimitBackoff = 60000; // start with 60s, increase on consecutive limits

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];

    // Deduplicate words in batch for efficiency
    const uniqueWords = [...new Set(batch.words)];

    try {
      const hebrewTranslations = await callGemini(uniqueWords);

      if (!Array.isArray(hebrewTranslations)) {
        console.error(`  ⚠️  Batch ${b + 1}: invalid response, skipping`);
        errors++;
        await sleep(DELAY_MS);
        continue;
      }

      // Handle size mismatch: use what we got instead of skipping
      if (hebrewTranslations.length !== uniqueWords.length) {
        console.warn(`  ⚠️  Batch ${b + 1}: got ${hebrewTranslations.length} translations for ${uniqueWords.length} words, using partial`);
      }

      // Map unique translations back
      const transMap = {};
      for (let i = 0; i < Math.min(uniqueWords.length, hebrewTranslations.length); i++) {
        transMap[uniqueWords[i]] = hebrewTranslations[i];
      }

      // Apply translations
      for (let i = 0; i < batch.words.length; i++) {
        const idx = batch.indices[i];
        const heb = transMap[batch.words[i]] || '';
        if (heb) {
          entries[idx].hebrew = heb;
          if (!entries[idx].definition || entries[idx].definition === entries[idx].russian) {
            entries[idx].definition = heb;
          }
          progress.translations[idx] = heb;
          translated++;
        }
      }

      // Progress
      progress.completedBatches = b + 1;
      if ((b + 1) % SAVE_EVERY === 0) {
        saveProgress(progress);
      }

      // Reset backoff on success
      rateLimitBackoff = 60000;

      if ((b + 1) % 10 === 0 || b === batches.length - 1) {
        const pct = ((b + 1) / batches.length * 100).toFixed(1);
        console.log(`[${b + 1}/${batches.length}] ${pct}% — ${translated} translated`);
      }

    } catch (err) {
      if (err.message === 'RATE_LIMIT') {
        console.log(`  ⏳ Rate limited at batch ${b + 1}, waiting ${rateLimitBackoff / 1000}s...`);
        saveProgress(progress);
        await sleep(rateLimitBackoff);
        rateLimitBackoff = Math.min(rateLimitBackoff * 1.5, 300000); // max 5 min
        b--; // retry
        continue;
      }
      console.error(`  ❌ Batch ${b + 1}: ${err.message}`);
      errors++;
    }

    await sleep(DELAY_MS);
  }

  // Final save
  saveProgress(progress);

  console.log('\n' + '='.repeat(60));
  console.log('📊 TRANSLATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Translated:  ${translated}`);
  console.log(`❌ Errors:      ${errors}`);
  console.log(`📊 Coverage:    ${((entries.filter(e => e.hebrew).length / entries.length) * 100).toFixed(1)}% now have Hebrew`);

  // Save final output
  const output = {
    ...dict,
    timestamp: new Date().toISOString(),
    description: 'Unified Juhuri dictionary with Hebrew translations (AI-generated from Russian)',
    total_entries: entries.length,
    field_coverage: {
      withHebrew: entries.filter(e => e.hebrew).length,
      withRussian: entries.filter(e => e.russian).length,
      withLatin: entries.filter(e => e.latin).length,
      withTerm: entries.filter(e => e.term).length,
    },
    entries,
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n💾 Saved: ${OUTPUT}`);

  // Clean up progress file on success
  if (errors === 0) {
    fs.unlinkSync(PROGRESS_FILE);
  }
}

run().catch(e => {
  console.error('\n❌ Fatal:', e.message);
  process.exit(1);
});
