import type { Metadata } from 'next';
import pool from '@/src/lib/db';
import { buildPageMeta } from '@/src/lib/seo-settings';
import {
  buildJsonLdGraph,
  buildDefinedTermJsonLd,
  buildBreadcrumbJsonLd,
} from '@/src/lib/jsonld';
import DictionaryWrapper from './DictionaryWrapper';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.SITE_URL || 'https://jun-juhuri.com';

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
}

interface TranslationRow {
  hebrew: string | null;
}

type Props = { params: Promise<{ term: string }> };

// ---------------------------------------------------------------------------
// Metadata (server-side SEO)
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { term } = await params;
  const decodedTerm = decodeURIComponent(term);

  const isNumericId = /^\d+$/.test(decodedTerm);
  const [rows] = await pool.query<DictionaryRow[] & any>(
    `SELECT * FROM dictionary_entries WHERE ${isNumericId ? '(id = ? OR term = ?)' : 'term = ?'} LIMIT 1`,
    isNumericId ? [decodedTerm, decodedTerm] : [decodedTerm],
  );
  const entry = (rows as DictionaryRow[])[0];
  if (!entry) {
    return { title: '\u05DE\u05D9\u05DC\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4' };
  }

  const displayTerm = entry.term || decodedTerm;
  const meanings = [entry.russian, entry.english].filter(Boolean).join(' | ');
  const descOverride = meanings
    ? `${displayTerm} \u2014 ${meanings}`
    : undefined;

  return buildPageMeta('word', { term: displayTerm }, {
    description: descOverride,
    ogType: 'article',
    canonicalPath: `/word/${encodeURIComponent(entry.term)}`,
  });
}

// ---------------------------------------------------------------------------
// JSON-LD component
// Safe: server-generated structured data from our own builders, not user input.
// This is the standard Next.js pattern for JSON-LD injection.
// ---------------------------------------------------------------------------
function JsonLdScript({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// ---------------------------------------------------------------------------
// Page: SSR metadata + JSON-LD for SEO, interactive client component for UI
// ---------------------------------------------------------------------------

export default async function WordPage({ params }: Props) {
  const { term } = await params;
  const decodedTerm = decodeURIComponent(term);

  // Fetch entry for JSON-LD structured data
  const isId = /^\d+$/.test(decodedTerm);
  const [entryRows] = await pool.query<DictionaryRow[] & any>(
    `SELECT * FROM dictionary_entries WHERE ${isId ? '(id = ? OR term = ?)' : 'term = ?'} LIMIT 1`,
    isId ? [decodedTerm, decodedTerm] : [decodedTerm],
  );
  const entry = (entryRows as DictionaryRow[])[0];

  // Fetch first translation for JSON-LD
  let firstHebrew: string | undefined;
  if (entry) {
    const [translationRows] = await pool.query<TranslationRow[] & any>(
      'SELECT hebrew FROM translations WHERE entry_id = ? LIMIT 1',
      [entry.id],
    );
    firstHebrew = (translationRows as TranslationRow[])[0]?.hebrew || undefined;
  }

  // Build JSON-LD for crawlers
  const jsonLd = entry
    ? buildJsonLdGraph(
        buildDefinedTermJsonLd({
          term: entry.term,
          russian: entry.russian || undefined,
          english: entry.english || undefined,
          hebrew: firstHebrew,
          partOfSpeech: entry.part_of_speech || undefined,
          pronunciationGuide: entry.pronunciation_guide || undefined,
        }),
        buildBreadcrumbJsonLd([
          { name: '\u05D3\u05E3 \u05D4\u05D1\u05D9\u05EA', url: SITE_URL },
          { name: '\u05DE\u05D9\u05DC\u05D5\u05DF', url: `${SITE_URL}/dictionary` },
          { name: entry.term, url: `${SITE_URL}/word/${encodeURIComponent(entry.term)}` },
        ]),
      )
    : null;

  return (
    <>
      {jsonLd && <JsonLdScript data={jsonLd} />}
      <DictionaryWrapper />
    </>
  );
}
