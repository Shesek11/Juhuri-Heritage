/**
 * Phonetic normalization for fuzzy Hebrew search.
 * Collapses homophones so that words that sound alike produce the same key.
 *
 * Must stay in sync with the JS copy in scripts/backfill-phonetic-key.js
 */
export function toPhoneticKey(hebrew: string): string {
  let s = hebrew;

  // 1. Strip niqqud and cantillation marks
  s = s.replace(/[\u0591-\u05C7]/g, '');

  // 2. Remove geresh variants (', ʼ, ׳, ')
  s = s.replace(/['\u05F3\u02BC\u2019]/g, '');

  // 3. Normalize final letters → regular form
  s = s.replace(/ך/g, 'כ');
  s = s.replace(/ם/g, 'מ');
  s = s.replace(/ן/g, 'נ');
  s = s.replace(/ף/g, 'פ');
  s = s.replace(/ץ/g, 'צ');

  // 4. Collapse double vav/yod before homophone mapping
  s = s.replace(/וו/g, 'ו');
  s = s.replace(/יי/g, 'י');

  // 5. Collapse homophones
  s = s.replace(/ת/g, 'ט');  // both /t/
  s = s.replace(/ש/g, 'ס');  // both /s/ (without shin dot)
  s = s.replace(/ק/g, 'כ');  // both /k/
  s = s.replace(/ח/g, 'כ');  // both /kh/
  s = s.replace(/ע/g, 'א');  // both silent/guttural
  s = s.replace(/ז/g, 'ג');  // ז׳↔ג׳ (zh/j confusion, common in Juhuri)
  s = s.replace(/צ/g, 'ג');  // צ׳↔ג׳ (ch/j, same sound in Juhuri)

  // 6. ה → א at start or end of each word (guttural confusion)
  s = s.replace(/(^|\s)ה/g, '$1א');
  s = s.replace(/ה($|\s)/g, 'א$1');

  // 7. Trim whitespace
  s = s.trim();

  return s;
}

/**
 * "Soft" phonetic normalization for ranking.
 * Strips niqqud/geresh, normalizes finals and doubles,
 * collapses clear homophones (ט↔ת, ס↔ש, כ↔ק↔ח, א↔ע),
 * but does NOT collapse ז/ג/צ — preserving the signal needed
 * for weighted distance comparison.
 */
export function toSoftPhoneticKey(hebrew: string): string {
  let s = hebrew;
  s = s.replace(/[\u0591-\u05C7]/g, '');
  s = s.replace(/['\u05F3\u02BC\u2019]/g, '');
  s = s.replace(/ך/g, 'כ').replace(/ם/g, 'מ').replace(/ן/g, 'נ').replace(/ף/g, 'פ').replace(/ץ/g, 'צ');
  s = s.replace(/וו/g, 'ו').replace(/יי/g, 'י');
  s = s.replace(/ת/g, 'ט');
  s = s.replace(/ש/g, 'ס');
  s = s.replace(/ק/g, 'כ').replace(/ח/g, 'כ');
  s = s.replace(/ע/g, 'א');
  s = s.replace(/(^|\s)ה/g, '$1א').replace(/ה($|\s)/g, 'א$1');
  return s.trim();
}
