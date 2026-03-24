const fs = require('fs');

const src = { source: 'מאגר', sourceName: 'סטמגי' };
const base = { term: '', latin: '', hebrew: '', english: '', definition: '', pronunciationGuide: '', dialect: '', ...src };

// Parse the Gemini output - format is: NUMBER. JUHURI_CYRILLIC | RUSSIAN_MEANING
const text = fs.readFileSync(process.argv[2] || 'data/raw/סטמגי/bukvar-gemini-output.txt', 'utf-8');
const lines = text.split('\n');

const entries = [];
const seen = new Set();

for (const line of lines) {
  const match = line.match(/^\d+\.\s+\*?\*?(.+?)\*?\*?\s*\|\s*(.+)/);
  if (!match) continue;

  let juhuri = match[1].replace(/\*\*/g, '').trim();
  let russian = match[2].trim();

  // Skip empty
  if (!juhuri || !russian) continue;

  // Dedup
  const key = juhuri.toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);

  entries.push({
    ...base,
    cyrillic: juhuri,
    russian: russian,
    partOfSpeech: '',
  });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const output = {
  timestamp: new Date().toISOString(),
  source_files: ['9070555acc266095d83c687ab7b300d7.pdf'],
  ...src,
  total_entries: entries.length,
  entries,
};

const outPath = `data/processed/dictionary-bukvar-stmegi-${timestamp}.json`;
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
console.log(`${entries.length} entries saved to ${outPath}`);
