import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import pool from '@/src/lib/db';
import {
  buildJsonLdGraph,
  buildDefinedTermJsonLd,
  buildBreadcrumbJsonLd,
} from '@/src/lib/jsonld';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.SITE_URL || 'https://jun-juhuri.com';

/** Map English POS to Hebrew label */
const POS_HEBREW: Record<string, string> = {
  noun: 'שם עצם',
  verb: 'פועל',
  adjective: 'שם תואר',
  adverb: 'תואר הפועל',
  pronoun: 'כינוי גוף',
  preposition: 'מילת יחס',
  conjunction: 'מילת חיבור',
  interjection: 'מילת קריאה',
  particle: 'מילית',
  numeral: 'שם מספר',
  determiner: 'מילת הגדרה',
  phrase: 'צירוף',
  idiom: 'ניב',
  expression: 'ביטוי',
};

function posToHebrew(pos: string): string {
  const lower = pos.toLowerCase().trim();
  return POS_HEBREW[lower] || pos;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DictionaryRow {
  id: number;
  term: string;
  russian: string | null;
  english: string | null;
  part_of_speech: string | null;
  pronunciation_guide: string | null;
  definitions: string | null;
  examples: string | null;
  field_sources: string | null;
}

interface TranslationRow {
  id: number;
  hebrew: string | null;
  latin: string | null;
  cyrillic: string | null;
  dialect_id: number | null;
  dialect: string | null;
}

type Props = { params: Promise<{ term: string }> };

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { term } = await params;
  const decodedTerm = decodeURIComponent(term);

  const [rows] = await pool.query<DictionaryRow[] & any>(
    'SELECT * FROM dictionary_entries WHERE term = ? LIMIT 1',
    [decodedTerm],
  );
  const entry = (rows as DictionaryRow[])[0];
  if (!entry) {
    return { title: 'מילה לא נמצאה' };
  }

  const meanings = [entry.russian, entry.english].filter(Boolean).join(' | ');
  const description = meanings
    ? `${entry.term} — ${meanings}`
    : `הגדרה ותרגום של "${entry.term}" במילון ג'והורי-עברי`;

  return {
    title: `${entry.term} — תרגום ג'והורי`,
    description,
    openGraph: {
      title: `${entry.term} — תרגום ג'והורי`,
      description,
      type: 'article',
      url: `${SITE_URL}/word/${encodeURIComponent(entry.term)}`,
    },
    alternates: {
      canonical: `${SITE_URL}/word/${encodeURIComponent(entry.term)}`,
    },
  };
}

// ---------------------------------------------------------------------------
// JSON-LD component
// Uses dangerouslySetInnerHTML which is safe here because the data is
// server-generated structured data from our own builders (not user input).
// This is the standard Next.js pattern for JSON-LD injection.
// ---------------------------------------------------------------------------
function JsonLdScript({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function WordPage({ params }: Props) {
  const { term } = await params;
  const decodedTerm = decodeURIComponent(term);

  // Fetch entry
  const [entryRows] = await pool.query<DictionaryRow[] & any>(
    'SELECT * FROM dictionary_entries WHERE term = ? LIMIT 1',
    [decodedTerm],
  );
  const entry = (entryRows as DictionaryRow[])[0];
  if (!entry) notFound();

  // Fetch translations
  const [translationRows] = await pool.query<TranslationRow[] & any>(
    `SELECT t.*, d.name as dialect
     FROM translations t
     LEFT JOIN dialects d ON t.dialect_id = d.id
     WHERE t.entry_id = ?`,
    [entry.id],
  );
  const translations = translationRows as TranslationRow[];

  // Parse JSON columns safely
  const definitions: string[] = safeJsonParse(entry.definitions, []);
  const examples: { origin: string; translated: string; transliteration?: string }[] =
    safeJsonParse(entry.examples, []);

  // JSON-LD
  const firstTranslation = translations[0];
  const jsonLd = buildJsonLdGraph(
    buildDefinedTermJsonLd({
      term: entry.term,
      russian: entry.russian || undefined,
      english: entry.english || undefined,
      hebrew: firstTranslation?.hebrew || undefined,
      partOfSpeech: entry.part_of_speech || undefined,
      pronunciationGuide: entry.pronunciation_guide || undefined,
    }),
    buildBreadcrumbJsonLd([
      { name: 'דף הבית', url: SITE_URL },
      { name: 'מילון', url: `${SITE_URL}/dictionary` },
      { name: entry.term, url: `${SITE_URL}/word/${encodeURIComponent(entry.term)}` },
    ]),
  );

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <JsonLdScript data={jsonLd} />

      {/* Breadcrumb */}
      <nav className="max-w-3xl mx-auto px-4 pt-6 text-sm text-slate-500 dark:text-slate-400">
        <ol className="flex items-center gap-2">
          <li>
            <a href="/" className="hover:text-amber-600 transition-colors">
              דף הבית
            </a>
          </li>
          <li>/</li>
          <li>
            <a href="/dictionary" className="hover:text-amber-600 transition-colors">
              מילון
            </a>
          </li>
          <li>/</li>
          <li className="text-slate-800 dark:text-slate-200 font-medium">{entry.term}</li>
        </ol>
      </nav>

      <article className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {entry.term}
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            {entry.part_of_speech && (
              <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">
                {posToHebrew(entry.part_of_speech)}
              </span>
            )}
            {entry.pronunciation_guide && (
              <span className="text-slate-500 dark:text-slate-400">
                /{entry.pronunciation_guide}/
              </span>
            )}
          </div>
        </header>

        {/* Quick translations (russian / english) */}
        {(entry.russian || entry.english) && (
          <section className="mb-8 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {entry.russian && (
              <p className="text-lg text-slate-700 dark:text-slate-300 mb-1">
                <span className="font-semibold text-slate-500 dark:text-slate-400 ml-2">
                  רוסית:
                </span>
                {entry.russian}
              </p>
            )}
            {entry.english && (
              <p className="text-lg text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-slate-500 dark:text-slate-400 ml-2">
                  אנגלית:
                </span>
                {entry.english}
              </p>
            )}
          </section>
        )}

        {/* Dialect Translations */}
        {translations.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">
              תרגומים לפי ניב
            </h2>
            <div className="space-y-3">
              {translations.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  {t.dialect && (
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2 uppercase tracking-wide">
                      {t.dialect}
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                    {t.hebrew && (
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 ml-1">עברית:</span>
                        <span className="text-slate-800 dark:text-slate-200">{t.hebrew}</span>
                      </div>
                    )}
                    {t.latin && (
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 ml-1">לטינית:</span>
                        <span className="text-slate-800 dark:text-slate-200" dir="ltr">
                          {t.latin}
                        </span>
                      </div>
                    )}
                    {t.cyrillic && (
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 ml-1">קירילית:</span>
                        <span className="text-slate-800 dark:text-slate-200">{t.cyrillic}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Definitions */}
        {definitions.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">
              הגדרות
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-slate-700 dark:text-slate-300">
              {definitions.map((def, i) => (
                <li key={i} className="leading-relaxed">
                  {def}
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Examples */}
        {examples.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">
              דוגמאות שימוש
            </h2>
            <div className="space-y-3">
              {examples.map((ex, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  <p className="font-medium text-slate-800 dark:text-slate-200 mb-1">
                    {ex.origin}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">{ex.translated}</p>
                  {ex.transliteration && (
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1" dir="ltr">
                      {ex.transliteration}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </article>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
