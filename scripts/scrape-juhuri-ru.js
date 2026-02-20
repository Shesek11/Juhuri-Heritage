#!/usr/bin/env node

/**
 * Scrape dictionary entries from juhuri.ru API.
 * API: https://juhuri.ru/api/words?page={n}&size={n}
 * Total: ~34,262 entries with fields: ru (Russian), cir (Juhuri Cyrillic)
 */

const fs = require('fs');
const path = require('path');

const API_BASE = 'https://juhuri.ru/api/words';
const PAGE_SIZE = 100;
const DELAY_MS = 300; // polite delay between requests
const OUTPUT_DIR = path.resolve(__dirname, '../data/processed');

async function fetchPage(page) {
  const url = `${API_BASE}?page=${page}&size=${PAGE_SIZE}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for page ${page}`);
  }
  return response.json();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('📡 Scraping juhuri.ru dictionary API...\n');

  // Fetch first page to get total count
  const first = await fetchPage(1);
  const total = first.total;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  console.log(`📊 Total entries: ${total}`);
  console.log(`📄 Pages to fetch: ${totalPages} (${PAGE_SIZE} per page)\n`);

  const allItems = [...first.items];
  console.log(`[1/${totalPages}] Fetched ${first.items.length} entries`);

  for (let page = 2; page <= totalPages; page++) {
    await sleep(DELAY_MS);

    try {
      const data = await fetchPage(page);
      allItems.push(...data.items);

      if (page % 20 === 0 || page === totalPages) {
        console.log(`[${page}/${totalPages}] Total fetched: ${allItems.length}`);
      }
    } catch (err) {
      console.error(`❌ Error on page ${page}: ${err.message}`);
      // Retry once after longer delay
      await sleep(2000);
      try {
        const data = await fetchPage(page);
        allItems.push(...data.items);
      } catch (err2) {
        console.error(`❌ Retry failed for page ${page}, skipping`);
      }
    }
  }

  console.log(`\n✅ Fetched ${allItems.length} raw entries\n`);

  // Transform to DictionaryEntry format
  const entries = [];
  const seen = new Set();
  let empty = 0;

  for (const item of allItems) {
    const russian = (item.ru || '').trim();
    const juhuri_cyr = (item.cir || '').trim();
    const latin = (item.lat || '').trim();
    const hebrew = (item.he || '').trim();
    const english = (item.en || '').trim();
    const partOfSpeech = (item.partSpeech || '').trim();

    // Skip entries without both Russian and Juhuri
    if (!russian && !juhuri_cyr) {
      empty++;
      continue;
    }

    // Dedup by juhuri+russian
    const key = `${juhuri_cyr}|${russian}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    entries.push({
      term: juhuri_cyr,       // Juhuri in Cyrillic (this site uses Cyrillic, not Hebrew chars)
      latin: latin,
      hebrew: hebrew,
      russian: russian,
      english: english,
      partOfSpeech: partOfSpeech ? mapPartOfSpeech(partOfSpeech) : '',
      definition: russian,    // Primary definition in Russian
      pronunciationGuide: '',
      dialect: 'General',
      source_id: item.id,
    });
  }

  console.log('='.repeat(60));
  console.log('📊 SCRAPING SUMMARY');
  console.log('='.repeat(60));
  console.log(`📡 Source:            juhuri.ru`);
  console.log(`📥 Raw entries:       ${allItems.length}`);
  console.log(`✅ Valid entries:      ${entries.length}`);
  console.log(`🗑️  Empty/skipped:     ${empty}`);
  console.log(`🔄 Duplicates:        ${allItems.length - entries.length - empty}`);

  // Show samples
  console.log('\n📋 Sample entries:');
  console.log('-'.repeat(60));
  for (let i = 0; i < Math.min(15, entries.length); i++) {
    const e = entries[i];
    console.log(`  ${e.term} → ${e.russian}`);
  }
  console.log(`  ... and ${Math.max(0, entries.length - 15)} more`);

  // Save
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(OUTPUT_DIR, `dictionary-juhuri-ru-${timestamp}.json`);

  const output = {
    timestamp: new Date().toISOString(),
    source_files: ['juhuri.ru'],
    source_name: 'juhuri.ru Online Dictionary (STMEGI)',
    source_url: 'https://juhuri.ru',
    total_entries: entries.length,
    entries,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n💾 Saved to: ${outputPath}`);
}

function mapPartOfSpeech(pos) {
  const map = {
    'noun': 'noun', 'verb': 'verb', 'adj': 'adj', 'adv': 'adv',
    'сущ': 'noun', 'гл': 'verb', 'прил': 'adj', 'нареч': 'adv',
  };
  return map[pos.toLowerCase()] || pos;
}

run().catch(e => {
  console.error('\n❌ Fatal:', e.message);
  process.exit(1);
});
