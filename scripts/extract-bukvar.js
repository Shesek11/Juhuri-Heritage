#!/usr/bin/env node

/**
 * Extract word entries from Isakov's Bukvar (Alphabet book) PDF.
 * (9070555acc266095d83c687ab7b300d7.pdf - 72 pages)
 *
 * Format: Juhuri words in Cyrillic with Russian translations.
 * Each page teaches a letter with example words.
 */

const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../data/raw/9070555acc266095d83c687ab7b300d7.pdf');
const OUTPUT_DIR = path.resolve(__dirname, '../data/processed');

// Pattern: "juhuri_word\nrussian_translation" or "juhuri_word    russian_translation"
// The bukvar has patterns like:
// аташ        (on the picture page)
// огонь       (Russian meaning appears in instructional text)
// Or paired: автобус    аслан\nлев

async function run() {
  console.log(`📂 Reading: ${INPUT}`);

  const buf = fs.readFileSync(INPUT);
  const uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  const p = new PDFParse(uint8);
  const result = await p.getText();

  const text = result.text;
  console.log(`📊 Text length: ${text.length} chars`);

  // The bukvar has word-translation pairs in the format:
  // "juhuri_cyrillic\nrussian_word" across pages
  // Let's extract known patterns from the alphabet pages

  // Look for word pairs: Juhuri Cyrillic word followed by Russian translation
  const entries = [];
  const seen = new Set();

  // Pattern 1: From the alphabet illustration page (page 6)
  // Format: "word\n" where word is Juhuri Cyrillic
  const alphabetWords = [
    { juhuri_cyr: 'аташ', russian: 'огонь', latin: 'atash' },
    { juhuri_cyr: 'болуш', russian: 'подушка', latin: 'bolush' },
    { juhuri_cyr: 'вини', russian: 'нос', latin: 'vini' },
    { juhuri_cyr: 'гилог', russian: 'ворона', latin: 'gilog' },
    { juhuri_cyr: 'дəрзə', russian: 'дверь', latin: 'dərzə' },
    { juhuri_cyr: 'əлҹəк', russian: 'серьги', latin: 'əlçək' },
    { juhuri_cyr: 'зəрдə', russian: 'жёлтый', latin: 'zərdə' },
    { juhuri_cyr: 'истиут', russian: 'перец', latin: 'istiut' },
    { juhuri_cyr: 'йобо', russian: 'дедушка', latin: 'yobo' },
    { juhuri_cyr: 'кордə', russian: 'нож', latin: 'kordə' },
    { juhuri_cyr: 'лəгə', russian: 'гнездо', latin: 'ləgə' },
    { juhuri_cyr: 'муш', russian: 'мышь', latin: 'mush' },
    { juhuri_cyr: 'назу', russian: 'тонкий', latin: 'nazu' },
    { juhuri_cyr: 'онҝур', russian: 'виноград', latin: 'ongur' },
    { juhuri_cyr: 'пар', russian: 'перо', latin: 'par' },
    { juhuri_cyr: 'сəⱨəт', russian: 'часы', latin: 'səħət' },
    { juhuri_cyr: 'туп', russian: 'мяч', latin: 'tup' },
    { juhuri_cyr: 'уту', russian: 'утюг', latin: 'utu' },
    { juhuri_cyr: 'тəлü', russian: 'лиса', latin: 'təlü' },
    { juhuri_cyr: 'фундуг', russian: 'фундук', latin: 'fundug' },
    { juhuri_cyr: 'hолов', russian: 'слива', latin: 'holov' },
    { juhuri_cyr: 'ħəйкəл', russian: 'синагога', latin: 'ħəjkəl' },
    { juhuri_cyr: 'ⱨəсб', russian: 'лошадь', latin: 'ⱨəsb' },
    { juhuri_cyr: 'чум', russian: 'глаз', latin: 'çum' },
    { juhuri_cyr: 'ҹəҹу', russian: 'ёж', latin: 'çəçu' },
    { juhuri_cyr: 'быз', russian: 'коза', latin: 'byz' },
    { juhuri_cyr: 'дüдü', russian: 'индюк', latin: 'düdü' },
    { juhuri_cyr: 'шунə', russian: 'гребень', latin: 'şunə' },
    { juhuri_cyr: 'ҝушт', russian: 'мясо', latin: 'guşt' },
    { juhuri_cyr: 'раса', russian: 'верёвка', latin: 'rasa' },
    { juhuri_cyr: 'хойə', russian: 'яйцо', latin: 'xojə' },
  ];

  // Also extract from the vocabulary pages
  // Pattern: paired lines "juhuri_word\nrussian_word" in vocabulary sections

  // Extract from text: look for pairs where Juhuri Cyrillic is followed by Russian
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Find word-translation patterns on letter pages
  // Format typically: "word\nmeaning" where word contains Juhuri Cyrillic chars
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1];

    // Look for pattern: "juhuri_cyrillic_word    russian_word" (tab-separated on same line)
    const tabMatch = line.match(/^([а-яёəüħⱨңқҝҹА-ЯЁ]+)\t+([а-яёА-ЯЁ].+)$/);
    if (tabMatch) {
      addEntry(entries, seen, tabMatch[1], tabMatch[2]);
    }
  }

  // Add the known alphabet words
  for (const w of alphabetWords) {
    addKnownEntry(entries, seen, w.juhuri_cyr, w.russian, w.latin);
  }

  // Also scan for "Слова из словаря" sections and extract words
  let inVocab = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('Слова из словаря') || line.includes('словаря для устного')) {
      inVocab = true;
      continue;
    }
    if (inVocab) {
      // Look for "juhuri_word\nrussian_meaning" pairs
      const pairMatch = line.match(/^([а-яёəüħⱨңқҝҹА-ЯЁ][а-яёəüħⱨңқҝҹА-ЯЁ\s\-']+)\s{2,}(.+)$/);
      if (pairMatch) {
        addEntry(entries, seen, pairMatch[1].trim(), pairMatch[2].trim());
      }

      // End of vocab section
      if (line.includes('Задание') || line.includes('Читаем') || /^[А-Яа-я]\s*$/.test(line)) {
        inVocab = false;
      }
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('📊 EXTRACTION SUMMARY (Bukvar)');
  console.log('='.repeat(60));
  console.log(`✅ Entries extracted: ${entries.length}`);
  console.log('');
  console.log('📋 Entries:');
  for (const e of entries) {
    console.log(`  ${e.latin || '?'} → ${e.russian}`);
  }

  // Save
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(OUTPUT_DIR, `dictionary-bukvar-${timestamp}.json`);

  const output = {
    timestamp: new Date().toISOString(),
    source_files: ['9070555acc266095d83c687ab7b300d7.pdf'],
    source_name: 'Isakov Bukvar (Alphabet Book, 2020)',
    total_entries: entries.length,
    entries,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n💾 Saved to: ${outputPath}`);
}

// Juhuri Latin → Hebrew transliteration
const TRANSLIT_MAP = {
  'a': 'אַ', 'b': 'בּ', 'c': "ג'", 'ç': "צ'", 'd': 'ד',
  'e': 'א', 'ə': 'אֶ', 'f': 'פ', 'g': 'ג', 'ğ': 'ע',
  'h': 'ה', 'ħ': 'ח', 'ⱨ': 'ח', 'x': 'ח', 'i': 'י',
  'j': "ז'", 'k': 'כּ', 'q': 'ק', 'l': 'ל',
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
      result += ch;
    }
  }
  return result;
}

function addKnownEntry(entries, seen, juhuri_cyr, russian, latin) {
  const key = latin.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  entries.push({
    term: transliterate(latin),
    latin,
    hebrew: '',
    russian,
    partOfSpeech: '',
    definition: russian,
    pronunciationGuide: latin,
    dialect: 'General',
  });
}

function addEntry(entries, seen, juhuri_cyr, russian) {
  const key = juhuri_cyr.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  entries.push({
    term: '',
    latin: '',
    hebrew: '',
    russian,
    partOfSpeech: '',
    definition: russian,
    pronunciationGuide: '',
    dialect: 'General',
  });
}

run().catch(e => console.error('Fatal:', e));
