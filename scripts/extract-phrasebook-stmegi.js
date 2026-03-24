const fs = require('fs');

const src = { source: 'מאגר', sourceName: 'סטמגי' };
const base = { term: '', latin: '', hebrew: '', english: '', definition: '', pronunciationGuide: '', dialect: '', ...src, partOfSpeech: '' };

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node extract-phrasebook-stmegi.js <gemini-output-file>');
  process.exit(1);
}

const text = fs.readFileSync(inputPath, 'utf-8');
const lines = text.split('\n');

const entries = [];
let currentRussian = null;

for (const line of lines) {
  const ruMatch = line.match(/\*\*Русский:\*\*\s*(.+)/);
  const juMatch = line.match(/\*\*Джуури:\*\*\s*(.+)/);

  if (ruMatch) {
    currentRussian = ruMatch[1].trim();
  } else if (juMatch && currentRussian) {
    const juhuri = juMatch[1].trim();
    entries.push({
      ...base,
      cyrillic: juhuri,
      russian: currentRussian,
    });
    currentRussian = null;
  }
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const output = {
  timestamp: new Date().toISOString(),
  source_files: ['bb58e76211b0ac0f47860085d6d5b370.pdf'],
  ...src,
  total_entries: entries.length,
  entries,
};

const outPath = `data/processed/dictionary-phrasebook-stmegi-${timestamp}.json`;
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
console.log(`${entries.length} entries saved to ${outPath}`);
