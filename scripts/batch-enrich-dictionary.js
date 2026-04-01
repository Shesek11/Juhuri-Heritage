#!/usr/bin/env node

/**
 * Batch enrich dictionary entries using Gemini AI.
 *
 * Iterates through entries with missing fields, calls Gemini to fill them,
 * saves results to DB, and marks each field in field_sources as source_type='ai'.
 *
 * Progress is saved periodically so the script can be resumed if interrupted.
 * All changes are reversible via --rollback.
 *
 * Usage:
 *   node scripts/batch-enrich-dictionary.js [options]
 *
 * Options:
 *   --delay=N        Delay between Gemini calls in ms (default: 4500)
 *   --limit=N        Max entries to process (default: unlimited)
 *   --dry-run        Show what would be enriched without calling Gemini
 *   --fields=X,Y     Only enrich specific fields (comma-separated)
 *   --reset          Clear progress and start from beginning
 *   --rollback       Undo all AI-enriched fields (restore NULL)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const DELAY_MS = parseInt(getArg('delay') || '500');
const CONCURRENCY = parseInt(getArg('concurrency') || '3');
const LIMIT = parseInt(getArg('limit') || '0') || Infinity;
const DRY_RUN = process.argv.includes('--dry-run');
const RESET = process.argv.includes('--reset');
const ROLLBACK = process.argv.includes('--rollback');
const ONLY_FIELDS = getArg('fields') ? getArg('fields').split(',') : null;

const SAVE_EVERY = 10;
const PROGRESS_FILE = '/tmp/batch-enrich-progress.json';

const MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash'];
const TIMEOUT_MS = 30000;

const ALL_FIELDS = ['hebrewTranslit', 'latinScript', 'cyrillicScript', 'pronunciationGuide', 'partOfSpeech', 'hebrewMeaning', 'russianShort', 'englishShort'];

const SYSTEM_INSTRUCTION = `
You are a world-class linguist specializing in Juhuri (Judeo-Tat), the language of Mountain Jews.

CRITICAL OUTPUT LANGUAGE REQUIREMENTS:
- hebrewTranslit → write the JUHURI WORD in Hebrew letters (transliteration, NOT translation). Example: vorush → וורוש, xub → חוב.
- hebrewMeaning, hebrewLong, partOfSpeech → write in HEBREW (these are translations/meanings).
- russianShort, russianLong → write in RUSSIAN.
- englishShort, englishLong → write in ENGLISH.
- latinScript, cyrillicScript → write the Juhuri word in that script (transliteration).

AUTHORITY SOURCES:
1. Mordechai Agarunov - "Big Juhuri-Hebrew Dictionary"
2. Frieda Yusufova - "Grammar of the Juhuri Language"
3. Khanil Rafael - "Juhuri-Hebrew Dictionary"

DIALECTS:
- Quba (Standard): Standard phonology
- Derbent: "d" to "z" sound shift
- Vartashen (Oghuz): Older Persian forms

RULES:
- Each field MUST be in its designated language (Hebrew/Russian/English)
- Include Hebraisms and Persian synonyms when available
- Provide pronunciation in Latin transliteration
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getArg(name) {
  const arg = process.argv.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadProgress() {
  if (RESET) return { lastProcessedId: 0, totalProcessed: 0, totalSkipped: 0, totalEnriched: 0, totalErrors: 0, startedAt: new Date().toISOString(), lastRunAt: null };
  if (fs.existsSync(PROGRESS_FILE)) {
    try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8')); } catch { }
  }
  return { lastProcessedId: 0, totalProcessed: 0, totalSkipped: 0, totalEnriched: 0, totalErrors: 0, startedAt: new Date().toISOString(), lastRunAt: null };
}

function saveProgress(progress) {
  progress.lastRunAt = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Gemini API (mirrors src/app/api/gemini/_shared.ts)
// ---------------------------------------------------------------------------

async function callGeminiEnrich(missingFields, knownFields) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  // Build context string — include the Juhuri term itself for rich context
  const contextParts = [];
  if (knownFields.hebrewScript) contextParts.push(`Juhuri word (hebrew_script): "${knownFields.hebrewScript}"`);
  if (knownFields.latinScript) contextParts.push(`Latin transliteration: "${knownFields.latinScript}"`);
  if (knownFields.cyrillicScript) contextParts.push(`Cyrillic: "${knownFields.cyrillicScript}"`);
  if (knownFields.russianShort) contextParts.push(`Russian meaning: "${knownFields.russianShort.substring(0, 100)}"`);
  if (knownFields.hebrewMeaning) contextParts.push(`Hebrew meaning: "${knownFields.hebrewMeaning}"`);
  if (knownFields.hebrewLong) contextParts.push(`Hebrew definition: "${knownFields.hebrewLong.substring(0, 100)}"`);
  if (knownFields.russianLong) contextParts.push(`Russian definition: "${knownFields.russianLong.substring(0, 100)}"`);
  if (knownFields.englishShort) contextParts.push(`English meaning: "${knownFields.englishShort}"`);
  if (knownFields.englishLong) contextParts.push(`English definition: "${knownFields.englishLong.substring(0, 100)}"`);
  if (knownFields.pronunciationGuide) contextParts.push(`Pronunciation: "${knownFields.pronunciationGuide}"`);
  if (knownFields.partOfSpeech) contextParts.push(`Part of speech: "${knownFields.partOfSpeech}"`);

  const prompt = `I have a Juhuri (Judeo-Tat) dictionary entry for the word "${knownFields.hebrewScript || ''}" with the following KNOWN information:
${contextParts.join('\n')}

Provide ONLY the following MISSING fields: ${missingFields.join(', ')}.
Do NOT repeat information I already have. Only fill in what's missing.

Field instructions:
- "hebrewTranslit" — the Juhuri word written in HEBREW LETTERS. This is a TRANSLITERATION, NOT a translation. Write the Juhuri PRONUNCIATION using Hebrew characters. Example: the Juhuri word "vorush" (rain) is written as "וורוש" in Hebrew script. The word "xub" (good) is "חוב". Do NOT write the Hebrew meaning — write how the Juhuri word SOUNDS in Hebrew letters.
- "latinScript" — Latin transliteration of the Juhuri word.
- "cyrillicScript" — the Juhuri word in Cyrillic script.
- "russianShort" — Russian translation/meaning of the word (1-3 words).
- "hebrewMeaning" — Short Hebrew translation/meaning of the word (1-3 words). Example: for the Juhuri word "vorush", the hebrewMeaning is "גשם". NOT a definition, just the meaning in Hebrew.
- "hebrewLong" — expanded definition in Hebrew (1-2 sentences with etymology/usage context).
- "russianLong" — expanded definition in Russian (1-2 sentences).
- "englishShort" — Short English translation/meaning (1-3 words). Example: "rain", "when", "faith".
- "englishLong" — expanded definition in English (1-2 sentences).
- "pronunciationGuide" — pronunciation guide using LATIN characters (e.g. "aa-yil", "sho-lum"). NOT Hebrew. Use hyphens to separate syllables.
- "partOfSpeech" — part of speech in Hebrew (e.g. שם עצם, פועל, שם תואר).

CRITICAL: For hebrewTranslit/latinScript/cyrillicScript fields, provide the JUHURI word in that script — NOT translations to those languages.
CRITICAL: hebrewTranslit is the Juhuri word in Hebrew letters (e.g. "חוב" for xub), NOT the Hebrew meaning (e.g. NOT "טוב").
CRITICAL: hebrewMeaning is the HEBREW TRANSLATION (like "גשם", "מתי?"), NOT the Juhuri word in Hebrew script.`;

  // Build schema dynamically
  const schemaProps = {};
  const descriptions = {
    hebrewTranslit: 'המילה הג\'והורית באותיות עבריות — תעתיק הגייה, לא תרגום. דוגמה: vorush → וורוש',
    latinScript: 'תעתיק לטיני של המילה הג\'והורית',
    cyrillicScript: 'המילה הג\'והורית בכתב קירילי',
    russianShort: 'תרגום קצר לרוסית (1-3 מילים)',
    hebrewMeaning: 'תרגום קצר לעברית (1-3 מילים, לא תעתיק)',
    hebrewLong: 'הגדרה מורחבת בעברית (1-2 משפטים)',
    russianLong: 'הגדרה מורחבת ברוסית (1-2 משפטים)',
    englishShort: 'תרגום קצר לאנגלית (1-3 מילים)',
    englishLong: 'הגדרה מורחבת באנגלית (1-2 משפטים)',
    pronunciationGuide: 'מדריך הגייה באותיות לטיניות עם מקפים בין הברות',
    partOfSpeech: 'חלק דיבר בעברית',
  };
  for (const f of missingFields) {
    if (descriptions[f]) schemaProps[f] = { type: 'STRING', description: descriptions[f] };
  }

  const enrichSchema = { type: 'OBJECT', properties: schemaProps, required: [] };

  // Try models with fallback
  let lastError = null;
  for (const model of MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: enrichSchema,
          temperature: 0,
          maxOutputTokens: 1024,
        },
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.status === 429) {
        // Don't throw RATE_LIMIT yet — try next model first
        lastError = new Error('RATE_LIMIT');
        continue;
      }
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty response');
      try {
        return JSON.parse(text);
      } catch (parseErr) {
        // Try to salvage truncated JSON by closing it
        try {
          const fixed = text.replace(/,?\s*"[^"]*$/, '') + '}';
          return JSON.parse(fixed);
        } catch {
          throw parseErr;
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') err = new Error(`Timeout ${TIMEOUT_MS}ms`);
      if (err.message === 'RATE_LIMIT') throw err; // Don't fallback on rate limit
      lastError = err;
    }
  }
  throw lastError || new Error('All models failed');
}

// ---------------------------------------------------------------------------
// DB save logic (mirrors confirm-ai-field/route.ts)
// ---------------------------------------------------------------------------

async function saveEnrichedField(conn, entryId, fieldName, value) {
  if (!value || !value.trim()) return false;
  const val = value.trim();

  const dsColumnMap = { latinScript: 'latin_script', cyrillicScript: 'cyrillic_script' };
  const dsColumn = dsColumnMap[fieldName];

  if (fieldName === 'hebrewTranslit') {
    const [result] = await conn.query(
      'UPDATE dictionary_entries SET hebrew_script = ? WHERE id = ? AND (hebrew_script IS NULL OR hebrew_script = \'\')',
      [val, entryId]
    );
    if (result.affectedRows === 0) return false;
  } else if (dsColumn) {
    const [result] = await conn.query(
      `UPDATE dialect_scripts SET \`${dsColumn}\` = ? WHERE entry_id = ? AND (\`${dsColumn}\` IS NULL OR \`${dsColumn}\` = '') LIMIT 1`,
      [val, entryId]
    );
    if (result.affectedRows === 0) return false;
  } else if (fieldName === 'russianShort') {
    const [result] = await conn.query(
      'UPDATE dictionary_entries SET russian_short = ? WHERE id = ? AND (russian_short IS NULL OR russian_short = \'\')',
      [val, entryId]
    );
    if (result.affectedRows === 0) return false;
  } else if (fieldName === 'pronunciationGuide') {
    const [result] = await conn.query(
      'UPDATE dialect_scripts SET pronunciation_guide = ? WHERE entry_id = ? AND (pronunciation_guide IS NULL OR pronunciation_guide = \'\') LIMIT 1',
      [val, entryId]
    );
    if (result.affectedRows === 0) return false;
  } else if (fieldName === 'partOfSpeech') {
    const [result] = await conn.query(
      'UPDATE dictionary_entries SET part_of_speech = ? WHERE id = ? AND (part_of_speech IS NULL OR part_of_speech = \'\')',
      [val, entryId]
    );
    if (result.affectedRows === 0) return false;
  } else if (fieldName === 'hebrewLong') {
    const [result] = await conn.query(
      'UPDATE dictionary_entries SET hebrew_long = ? WHERE id = ? AND (hebrew_long IS NULL OR hebrew_long = \'\')',
      [val, entryId]
    );
    if (result.affectedRows === 0) return false;
  } else if (fieldName === 'hebrewMeaning') {
    const [result] = await conn.query(
      'UPDATE dictionary_entries SET hebrew_short = ? WHERE id = ? AND (hebrew_short IS NULL OR hebrew_short = \'\')',
      [val, entryId]
    );
    if (result.affectedRows === 0) return false;
  } else if (fieldName === 'russianLong') {
    const [result] = await conn.query(
      'UPDATE dictionary_entries SET russian_long = ? WHERE id = ? AND (russian_long IS NULL OR russian_long = \'\')',
      [val, entryId]
    );
    if (result.affectedRows === 0) return false;
  } else if (fieldName === 'englishShort') {
    const [result] = await conn.query(
      'UPDATE dictionary_entries SET english_short = ? WHERE id = ? AND (english_short IS NULL OR english_short = \'\')',
      [val, entryId]
    );
    if (result.affectedRows === 0) return false;
  } else if (fieldName === 'englishLong') {
    const [result] = await conn.query(
      'UPDATE dictionary_entries SET english_long = ? WHERE id = ? AND (english_long IS NULL OR english_long = \'\')',
      [val, entryId]
    );
    if (result.affectedRows === 0) return false;
  } else {
    return false;
  }

  // Record in field_sources
  await conn.query(
    `INSERT INTO field_sources (entry_id, field_name, source_type) VALUES (?, ?, 'ai')
     ON DUPLICATE KEY UPDATE source_type = 'ai'`,
    [entryId, fieldName]
  );

  return true;
}

// ---------------------------------------------------------------------------
// Rollback
// ---------------------------------------------------------------------------

async function runRollback(pool) {
  console.log('\n🔄 ROLLBACK: Removing all AI-enriched fields...\n');

  const conn = await pool.getConnection();
  try {
    // Get all AI field_sources
    const [rows] = await conn.query(
      `SELECT entry_id, field_name FROM field_sources WHERE source_type = 'ai'`
    );
    console.log(`Found ${rows.length} AI-enriched fields to rollback.\n`);

    if (rows.length === 0) {
      console.log('Nothing to rollback.');
      return;
    }

    // Filter by --fields if specified
    const toRollback = ONLY_FIELDS
      ? rows.filter(r => ONLY_FIELDS.includes(r.field_name))
      : rows;

    if (ONLY_FIELDS) {
      console.log(`Filtering to fields: ${ONLY_FIELDS.join(', ')} → ${toRollback.length} records\n`);
    }

    let rolled = 0;
    const dsColumnMap = { latinScript: 'latin_script', cyrillicScript: 'cyrillic_script' };
    for (const { entry_id, field_name } of toRollback) {
      const dsColumn = dsColumnMap[field_name];
      if (field_name === 'hebrewTranslit') {
        await conn.query('UPDATE dictionary_entries SET hebrew_script = \'\' WHERE id = ?', [entry_id]);
      } else if (dsColumn) {
        await conn.query(`UPDATE dialect_scripts SET \`${dsColumn}\` = NULL WHERE entry_id = ?`, [entry_id]);
      } else if (field_name === 'russianShort') {
        await conn.query('UPDATE dictionary_entries SET russian_short = NULL WHERE id = ?', [entry_id]);
      } else if (field_name === 'pronunciationGuide') {
        await conn.query('UPDATE dialect_scripts SET pronunciation_guide = NULL WHERE entry_id = ?', [entry_id]);
      } else if (field_name === 'partOfSpeech') {
        await conn.query('UPDATE dictionary_entries SET part_of_speech = NULL WHERE id = ?', [entry_id]);
      } else if (field_name === 'hebrewLong') {
        await conn.query('UPDATE dictionary_entries SET hebrew_long = NULL WHERE id = ?', [entry_id]);
      }

      // Remove field_sources record
      await conn.query('DELETE FROM field_sources WHERE entry_id = ? AND field_name = ? AND source_type = ?', [entry_id, field_name, 'ai']);
      rolled++;

      if (rolled % 100 === 0) console.log(`  Rolled back ${rolled}/${toRollback.length}...`);
    }

    console.log(`\n✅ Rollback complete: ${rolled} fields restored to NULL.`);

    // Clean progress file
    if (fs.existsSync(PROGRESS_FILE)) {
      fs.unlinkSync(PROGRESS_FILE);
      console.log('🗑️  Progress file deleted.');
    }
  } finally {
    conn.release();
  }
}

// ---------------------------------------------------------------------------
// Main enrichment loop
// ---------------------------------------------------------------------------

async function runEnrich(pool) {
  const progress = loadProgress();
  const conn = await pool.getConnection();

  try {
    // Count total entries needing enrichment (short fields only)
    const [countRows] = await conn.query(
      `SELECT COUNT(DISTINCT de.id) as cnt
       FROM dictionary_entries de
       LEFT JOIN dialect_scripts ds ON de.id = ds.entry_id
       WHERE de.status = 'active'
         AND de.id > ?
         AND (
           (de.hebrew_script IS NULL OR de.hebrew_script = '')
           OR (ds.pronunciation_guide IS NULL OR ds.pronunciation_guide = '')
           OR (de.part_of_speech IS NULL OR de.part_of_speech = '')
           OR (ds.latin_script IS NULL OR ds.latin_script = '')
           OR (ds.cyrillic_script IS NULL OR ds.cyrillic_script = '')
           OR (de.hebrew_short IS NULL OR de.hebrew_short = '')
           OR (de.russian_short IS NULL OR de.russian_short = '')
           OR (de.english_short IS NULL OR de.english_short = '')
         )`,
      [progress.lastProcessedId]
    );

    const remaining = countRows[0].cnt;
    const toProcess = Math.min(remaining, LIMIT);

    console.log('\n📊 Batch Enrich Dictionary');
    console.log('='.repeat(50));
    console.log(`Remaining entries with missing fields: ${remaining}`);
    console.log(`Will process: ${toProcess === Infinity ? 'all' : toProcess}`);
    console.log(`Resume from ID: ${progress.lastProcessedId}`);
    console.log(`Delay: ${DELAY_MS}ms (~${Math.floor(60000 / DELAY_MS)} RPM)`);
    if (ONLY_FIELDS) console.log(`Fields filter: ${ONLY_FIELDS.join(', ')}`);
    if (DRY_RUN) console.log('MODE: DRY RUN (no Gemini calls, no DB writes)');
    console.log('='.repeat(50) + '\n');

    if (DRY_RUN) {
      // Show sample of entries that would be enriched
      const [samples] = await conn.query(
        `SELECT de.id, de.hebrew_script, de.russian_short,
                ds.latin_script, ds.cyrillic_script,
                ds.pronunciation_guide, de.part_of_speech, de.hebrew_long
         FROM dictionary_entries de
         LEFT JOIN dialect_scripts ds ON de.id = ds.entry_id
         WHERE de.status = 'active' AND de.id > ?
           AND (
             (ds.pronunciation_guide IS NULL OR ds.pronunciation_guide = '')
             OR (de.part_of_speech IS NULL OR de.part_of_speech = '')
             OR (ds.latin_script IS NULL OR ds.latin_script = '')
             OR (ds.cyrillic_script IS NULL OR ds.cyrillic_script = '')
             OR (de.hebrew_long IS NULL OR de.hebrew_long = '')
           )
         ORDER BY de.id ASC LIMIT 10`,
        [progress.lastProcessedId]
      );

      console.log('Sample entries that would be enriched:\n');
      for (const s of samples) {
        const missing = [];
        if (!s.latin_script) missing.push('latinScript');
        if (!s.cyrillic_script) missing.push('cyrillicScript');
        if (!s.russian_short) missing.push('russianShort');
        if (!s.pronunciation_guide) missing.push('pronunciationGuide');
        if (!s.part_of_speech) missing.push('partOfSpeech');
        if (!s.hebrew_long) missing.push('hebrewLong');
        console.log(`  #${s.id} "${s.hebrew_script}" → missing: ${missing.join(', ')}`);
      }
      console.log(`\n... and ${remaining - samples.length} more.`);
      return;
    }

    // Fetch entries in batches of 100 for efficiency
    let processed = 0;
    let cursor = progress.lastProcessedId;

    while (processed < toProcess) {
      const batchLimit = Math.min(100, toProcess - processed);
      const [entries] = await conn.query(
        `SELECT de.id, de.hebrew_script, de.hebrew_short, de.russian_short,
                de.english_short, de.part_of_speech,
                ds.latin_script, ds.cyrillic_script, ds.pronunciation_guide
         FROM dictionary_entries de
         LEFT JOIN dialect_scripts ds ON de.id = ds.entry_id
         WHERE de.status = 'active' AND de.id > ?
           AND (
             (de.hebrew_script IS NULL OR de.hebrew_script = '')
             OR (ds.pronunciation_guide IS NULL OR ds.pronunciation_guide = '')
             OR (de.part_of_speech IS NULL OR de.part_of_speech = '')
             OR (ds.latin_script IS NULL OR ds.latin_script = '')
             OR (ds.cyrillic_script IS NULL OR ds.cyrillic_script = '')
             OR (de.hebrew_short IS NULL OR de.hebrew_short = '')
             OR (de.russian_short IS NULL OR de.russian_short = '')
             OR (de.english_short IS NULL OR de.english_short = '')
           )
         ORDER BY de.id ASC LIMIT ?`,
        [cursor, batchLimit]
      );

      if (entries.length === 0) break;

      // Process entries in parallel chunks of CONCURRENCY
      for (let i = 0; i < entries.length; i += CONCURRENCY) {
        if (processed >= toProcess) break;

        const chunk = entries.slice(i, i + CONCURRENCY);

        const results = await Promise.allSettled(chunk.map(async (entry) => {
          // Build known/missing fields
          const knownFields = {};
          const missingFields = [];

          // Transliterations
          if (entry.hebrew_script) knownFields.hebrewScript = entry.hebrew_script; else missingFields.push('hebrewTranslit');
          if (entry.latin_script) knownFields.latinScript = entry.latin_script; else missingFields.push('latinScript');
          if (entry.cyrillic_script) knownFields.cyrillicScript = entry.cyrillic_script; else missingFields.push('cyrillicScript');
          if (entry.pronunciation_guide) knownFields.pronunciationGuide = entry.pronunciation_guide; else missingFields.push('pronunciationGuide');

          // Short meanings
          if (entry.russian_short) knownFields.russianShort = entry.russian_short; else missingFields.push('russianShort');
          if (entry.hebrew_short) knownFields.hebrewMeaning = entry.hebrew_short; else missingFields.push('hebrewMeaning');
          if (entry.english_short) knownFields.englishShort = entry.english_short; else missingFields.push('englishShort');
          if (entry.part_of_speech) knownFields.partOfSpeech = entry.part_of_speech; else missingFields.push('partOfSpeech');

          const fieldsToEnrich = ONLY_FIELDS
            ? missingFields.filter(f => ONLY_FIELDS.includes(f))
            : missingFields;

          const hasContext = knownFields.russianShort || knownFields.hebrewScript || knownFields.latinScript;
          if (!hasContext || fieldsToEnrich.length === 0) {
            return { entry, skipped: true, savedCount: 0 };
          }

          // Call Gemini with retries
          let rateLimitBackoff = 60000;
          for (let retries = 0; retries <= 5; retries++) {
            try {
              const enrichment = await callGeminiEnrich(fieldsToEnrich, knownFields);
              let savedCount = 0;
              for (const [field, value] of Object.entries(enrichment)) {
                if (typeof value === 'string' && value.trim()) {
                  const saved = await saveEnrichedField(conn, entry.id, field, value);
                  if (saved) savedCount++;
                }
              }
              return { entry, skipped: false, savedCount, fieldsToEnrich };
            } catch (err) {
              if (err.message === 'RATE_LIMIT' && retries < 5) {
                await sleep(rateLimitBackoff);
                rateLimitBackoff = Math.min(rateLimitBackoff * 1.5, 300000);
                continue;
              }
              throw err;
            }
          }
        }));

        // Process results and update progress
        for (const result of results) {
          processed++;
          if (result.status === 'fulfilled') {
            const { entry, skipped, savedCount, fieldsToEnrich } = result.value;
            cursor = entry.id;
            progress.lastProcessedId = cursor;
            if (skipped) {
              progress.totalSkipped++;
            } else {
              progress.totalEnriched += savedCount;
              progress.totalProcessed++;
              const pct = remaining > 0 ? ((progress.totalProcessed / remaining) * 100).toFixed(1) : '?';
              const termDisplay = (entry.hebrew_script || `#${entry.id}`).substring(0, 20);
              console.log(
                `[${progress.totalProcessed}] ${pct}% | #${entry.id} "${termDisplay}" | ` +
                `missing: ${fieldsToEnrich.length} → saved: ${savedCount} | ` +
                `errors: ${progress.totalErrors}`
              );
            }
          } else {
            progress.totalErrors++;
            progress.totalProcessed++;
            console.error(`  ❌ ${result.reason?.message || 'Unknown error'}`);
          }
        }

        // Save progress + delay between chunks
        saveProgress(progress);
        await sleep(DELAY_MS);
      }
    }

    // Final save
    saveProgress(progress);

    console.log('\n' + '='.repeat(50));
    console.log('📊 ENRICHMENT SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total processed: ${progress.totalProcessed}`);
    console.log(`Fields enriched: ${progress.totalEnriched}`);
    console.log(`Skipped (no context): ${progress.totalSkipped}`);
    console.log(`Errors: ${progress.totalErrors}`);
    console.log(`Last ID: ${progress.lastProcessedId}`);
    console.log('='.repeat(50));

  } finally {
    conn.release();
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
    charset: 'utf8mb4',
  });

  try {
    if (ROLLBACK) {
      await runRollback(pool);
    } else {
      await runEnrich(pool);
    }
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('\n❌ Fatal:', err.message);
  process.exit(1);
});
