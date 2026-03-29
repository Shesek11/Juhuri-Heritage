/** Translate dialect names based on locale */
const DIALECT_NAMES: Record<string, Record<string, string>> = {
  General:     { he: 'כללי',       en: 'General',      ru: 'Общий' },
  Derbent:     { he: 'דרבנט',      en: 'Derbent',       ru: 'Дербент' },
  Quba:        { he: 'קובא',       en: 'Quba',          ru: 'Куба' },
  Makhachkala: { he: 'מחצ׳קלה',   en: 'Makhachkala',   ru: 'Махачкала' },
  Qaitoqi:     { he: 'קייטוקי',    en: 'Qaitoqi',       ru: 'Кайтаги' },
  Shirvoni:    { he: 'שירווני',    en: 'Shirvoni',      ru: 'Ширвони' },
};

export function getDialectDisplayName(dialect: string | undefined | null, locale: string): string {
  if (!dialect || dialect === 'לא ידוע') return '-';
  const names = DIALECT_NAMES[dialect];
  if (names) return names[locale] || names.en || dialect;
  return dialect;
}

/** Pick the best term to display for a dictionary entry based on locale */
export function getTermByLocale(
  entry: { hebrewScript?: string; latinScript?: string; cyrillicScript?: string; hebrew?: string; latin?: string; cyrillic?: string },
  locale: string
): string {
  // Normalize field names (API returns both styles depending on endpoint)
  const heb = entry.hebrewScript || entry.hebrew || '';
  const lat = entry.latinScript || entry.latin || '';
  const cyr = entry.cyrillicScript || entry.cyrillic || '';

  if (locale === 'ru') return cyr || lat || heb || '—';
  if (locale === 'en') return lat || heb || cyr || '—';
  // Hebrew default: show Hebrew script (which is usually the Hebrew meaning/term)
  return heb || lat || cyr || '—';
}

/** Pick the best meaning/subtitle for a dictionary entry based on locale */
export function getMeaningByLocale(
  entry: { hebrewShort?: string; englishShort?: string; russianShort?: string; latinScript?: string; latin?: string },
  locale: string
): string | undefined {
  if (locale === 'ru') return entry.russianShort || entry.hebrewShort;
  if (locale === 'en') return entry.englishShort || entry.hebrewShort;
  // Hebrew: show Latin transliteration as subtitle (since Hebrew meaning = term)
  return entry.latinScript || entry.latin || undefined;
}
