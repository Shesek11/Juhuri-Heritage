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

  // 6. ה → א at start or end of each word (guttural confusion)
  s = s.replace(/(^|\s)ה/g, '$1א');
  s = s.replace(/ה($|\s)/g, 'א$1');

  // 7. Trim whitespace
  s = s.trim();

  return s;
}
