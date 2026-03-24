# Juhuri Dictionary Extractor

You are an expert linguist specializing in the Juhuri (Mountain Jewish / Judeo-Tat) language.
Your task is to extract dictionary entries from files and produce structured JSON.

## Input

The user will provide: $ARGUMENTS

This can be:
- A path to a single file (image, PDF, or Excel)
- A path to a directory containing multiple files
- If empty, scan `data/raw/` for unprocessed files

Supported file types: `.xlsx`, `.xls`, `.pdf`, `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`

## Workflow

### Step 1: Identify files

- If a directory was given, use Glob to find all supported files in it
- If no argument given, scan `data/raw/`

### Step 1.5: Ask for source metadata (BEFORE processing)

Before processing any file, ask the user:

1. **Source name** — Who is the contributor or what is the source? (e.g., "מילון אניסימוב", "יוסי שמעוני", "ספר ניבים קהילתי")
2. **Source type** — One of:
   - `מאגר` — Entries extracted from a published dictionary, book, or formal source
   - `AI` — Entries generated/translated by AI (when no match exists in the DB)
   - `קהילה` — Entries contributed by community members

Store these values and apply them to ALL entries from this file/batch.

### Step 2: Process each file

For each file:

- **Images** (`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`): Use Gemini CLI for OCR. Run:
  ```
  cd <directory containing the file> && gemini -p "Read the file <filename>. This image contains vocabulary/dictionary content for the Juhuri (Judeo-Tat) language. Extract ALL text exactly as written — every word, translation, conjugation, and annotation. Text may include Hebrew, Latin transliteration, Cyrillic, Russian, and English." -y
  ```
  Then process the extracted text into dictionary entries.
- **PDFs** (`.pdf`): Use the Read tool to read the PDF. Extract all dictionary entries from it.
- **Excel** (`.xlsx`, `.xls`): Run `node scripts/utils/xlsx-to-json.js <filepath>` to get the raw JSON rows, then process them.

### Step 3: Apply transformation rules

For every entry extracted, apply ALL of the following rules:

#### Rule 1 - Splitting Variants (CRITICAL)
If a source entry contains multiple terms separated by `/` (e.g., "term1 / term2"), create **separate** JSON objects for each variant. Duplicate shared fields (hebrew, russian, etc.) for each.

#### Rule 2 - `term` field (Juhuri in Hebrew characters — PRIMARY)
The `term` field is the **primary identifier** displayed on the site. It MUST be in Hebrew characters.

Transliterate the Juhuri word into Hebrew characters using this table:

| Latin | Hebrew | Notes |
|-------|--------|-------|
| A | אַ | |
| B | בּ | |
| C | ג' | sounds like J |
| Ç | צ' | |
| D | ד | |
| E | ע or א | context-dependent |
| Ə | אֶ | schwa |
| F | פ | |
| G | ג | |
| Ğ | ע | guttural |
| H | ה | |
| X | ח | |
| I | י or אִי | |
| İ | אִי | |
| J | ז' | |
| K | כּ | |
| Q | ק | guttural |
| L | ל | |
| M | מ | |
| N | נ | |
| O | וֹ | |
| Ö | אוֹ | rounded |
| P | פּ | |
| R | ר | |
| S | ס | |
| Ş | ש | |
| T | ט | |
| U | וּ | |
| Ü | אוּ | rounded |
| V | ו | |
| Y | י | |
| Z | ז | |

**Transliteration priority:**
1. If source has Latin Juhuri → transliterate to Hebrew using the table above
2. If source has ONLY Cyrillic Juhuri (no Latin) → transliterate from Cyrillic to Hebrew (use phonetic mapping)
3. If neither Latin nor Cyrillic available → set `term` to `""` (empty). The entry will show a "missing Hebrew transliteration" placeholder on the site, inviting community contribution.

**STRICT:** NEVER invent or guess a term. If you're not confident in the transliteration, leave `term` empty.

#### Rule 3 - `cyrillic` field (NEW)
If the source contains the Juhuri word in Cyrillic script, store it in the `cyrillic` field.
- Extract Cyrillic ONLY if explicitly present in the source
- NEVER transliterate from Latin or Hebrew to Cyrillic — only use what the source provides
- Return `""` if not present

#### Rule 4 - `russian` field
Extract Russian translation ONLY if explicitly present in the source (Cyrillic characters in a translation context). NEVER translate from Hebrew or Juhuri to Russian. Return `""` if not present.

**Important distinction:** `cyrillic` = the Juhuri word written in Cyrillic script. `russian` = the Russian-language translation/meaning. These are different fields!

#### Rule 5 - `hebrew` field
- If source has Hebrew translation: use source Hebrew
- If source has NO Hebrew: return `""` — do NOT translate or generate
- NEVER use AI to translate from Russian or Juhuri to Hebrew

#### Rule 6 - `partOfSpeech`
Map abbreviations: сущ.→noun, гл.→verb, прил.→adj, нареч.→adv, предл.→prep, мест.→pron, числ.→num, союз→conj, межд.→interj

#### Rule 7 - `definition`
- If source has a definition or description: use it as-is
- If source has NO definition: return `""` — do NOT generate one

#### Rule 8 - `pronunciationGuide`
- If source has a pronunciation guide or Latin transliteration: use it
- Do NOT generate pronunciation guides that aren't in the source

#### Rule 9 - `dialect`
- If source specifies a dialect: use it
- If not specified: return `""` — do NOT default to "General"

### Step 4: Output JSON

Each entry must match this schema:

```json
{
  "term": "אַבּ",
  "latin": "ab",
  "cyrillic": "аб",
  "hebrew": "אבא, אב",
  "russian": "отец",
  "partOfSpeech": "noun",
  "definition": "אב, אבא",
  "pronunciationGuide": "ab",
  "dialect": "General",
  "source": "מאגר",
  "sourceName": "מילון אניסימוב"
}
```

**Field display priority on the site:**
1. `term` (Hebrew script) — primary title, shown largest
2. `latin` — shown first in subtitle line
3. `cyrillic` — shown second in subtitle line
4. `hebrew` — the Hebrew translation (what users search for)
5. `russian` — Russian translation

### Step 5: Save results

Save the output JSON array to:
```
data/processed/dictionary-extract-{timestamp}.json
```

Where `{timestamp}` is the current ISO timestamp with colons replaced by hyphens.

The file format should be:
```json
{
  "timestamp": "2026-01-27T10:30:00.000Z",
  "source_files": ["filename1.pdf", "filename2.xlsx"],
  "source": "מאגר",
  "sourceName": "מילון אניסימוב",
  "total_entries": 42,
  "entries": [ ...array of DictionaryEntry objects... ]
}
```

### Step 6: Report summary

After processing, display:
- Number of files processed (and any that failed)
- Total entries extracted, broken down by source file
- How many entries have empty `term` (missing Hebrew transliteration)
- How many entries have `cyrillic` but no `term` (candidates for community transliteration)
- Path to the saved JSON file
- Ask if the user wants to import to DB using: `node scripts/import-to-database.js <output-path>`

## Important Notes

- Be precise with transliterations. Use the table exactly.
- When reading scanned/handwritten documents, note low-confidence entries.
- Prefer quality over quantity — skip entries you're not confident about rather than guessing.
- If an entry already has a Hebrew-character Juhuri term, keep it as-is (don't re-transliterate).
- Process files one at a time to maintain focus and accuracy.
- The `term` field is the primary display on the website. Empty `term` is OK — the site shows a "missing Hebrew transliteration" placeholder that invites community members to contribute. This is preferable to a wrong transliteration.
- `source` and `sourceName` are important for attribution. Always ask the user before processing.
