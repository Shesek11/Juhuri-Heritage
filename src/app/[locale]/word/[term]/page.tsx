import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
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
  slug: string | null;
  hebrew_script: string;
  hebrew_short: string | null;
  russian_short: string | null;
  english_short: string | null;
  hebrew_long: string | null;
  part_of_speech: string | null;
}

interface DialectScriptRow {
  hebrew_script: string | null;
  pronunciation_guide: string | null;
}

type Props = { params: Promise<{ locale: string; term: string }> };

// ---------------------------------------------------------------------------
// Metadata (server-side SEO)
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, term } = await params;
  const decodedTerm = decodeURIComponent(term);

  const isNumericId = /^\d+$/.test(decodedTerm);
  const isLatin = /^[a-z0-9\u00c0-\u024f\-]+$/i.test(decodedTerm);

  let where: string;
  let qp: any[];
  if (isNumericId) {
    where = '(id = ? OR hebrew_script = ? OR slug = ?)';
    qp = [decodedTerm, decodedTerm, decodedTerm];
  } else if (isLatin) {
    where = '(slug = ? OR hebrew_script = ?)';
    qp = [decodedTerm, decodedTerm];
  } else {
    where = 'hebrew_script = ?';
    qp = [decodedTerm];
  }

  const [rows] = await pool.query<DictionaryRow[] & any>(
    `SELECT * FROM dictionary_entries WHERE ${where} LIMIT 1`,
    qp,
  );
  const entry = (rows as DictionaryRow[])[0];
  if (!entry) {
    return { title: '\u05DE\u05D9\u05DC\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4' };
  }

  const displayTerm = entry.hebrew_script || decodedTerm;
  const canonicalSlug = entry.slug || encodeURIComponent(entry.hebrew_script);
  const meanings = [entry.hebrew_short, entry.russian_short, entry.english_short].filter(Boolean).join(' | ');
  let descOverride = meanings
    ? `${displayTerm} \u2014 ${meanings}`
    : undefined;
  // Clamp meta description: min 50, max 160 chars
  if (descOverride) {
    if (descOverride.length < 50) {
      descOverride += " | מילון ג'והורי-עברי לשימור שפת יהודי ההרים";
    } else if (descOverride.length > 160) {
      descOverride = descOverride.slice(0, descOverride.lastIndexOf(' ', 157)) + '...';
    }
  }

  return buildPageMeta('word', { term: displayTerm }, {
    description: descOverride,
    ogType: 'article',
    canonicalPath: `/word/${canonicalSlug}`,
    locale,
    dynamicOgImage: true,
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
  const isLatinSlug = /^[a-z0-9\u00c0-\u024f\-]+$/i.test(decodedTerm);

  let entryWhere: string;
  let entryParams: any[];
  if (isId) {
    entryWhere = '(id = ? OR hebrew_script = ? OR slug = ?)';
    entryParams = [decodedTerm, decodedTerm, decodedTerm];
  } else if (isLatinSlug) {
    entryWhere = '(slug = ? OR hebrew_script = ?)';
    entryParams = [decodedTerm, decodedTerm];
  } else {
    entryWhere = 'hebrew_script = ?';
    entryParams = [decodedTerm];
  }

  const [entryRows] = await pool.query<DictionaryRow[] & any>(
    `SELECT * FROM dictionary_entries WHERE ${entryWhere} LIMIT 1`,
    entryParams,
  );
  const entry = (entryRows as DictionaryRow[])[0];

  // Redirect old Hebrew/ID URLs to canonical latin slug
  if (entry?.slug && decodedTerm !== entry.slug) {
    const { locale: pageLocale } = await params;
    permanentRedirect(`/${pageLocale}/word/${entry.slug}`);
  }

  // Fetch first dialect script for JSON-LD pronunciation
  let firstPronunciation: string | undefined;
  if (entry) {
    const [dialectRows] = await pool.query<DialectScriptRow[] & any>(
      'SELECT pronunciation_guide FROM dialect_scripts WHERE entry_id = ? LIMIT 1',
      [entry.id],
    );
    firstPronunciation = (dialectRows as DialectScriptRow[])[0]?.pronunciation_guide || undefined;
  }

  // Build JSON-LD for crawlers
  const jsonLd = entry
    ? buildJsonLdGraph(
        buildDefinedTermJsonLd({
          slug: entry.slug,
          hebrewScript: entry.hebrew_script,
          hebrewShort: entry.hebrew_short || undefined,
          russianShort: entry.russian_short || undefined,
          englishShort: entry.english_short || undefined,
          partOfSpeech: entry.part_of_speech || undefined,
          pronunciationGuide: firstPronunciation,
        }),
        buildBreadcrumbJsonLd([
          { name: '\u05D3\u05E3 \u05D4\u05D1\u05D9\u05EA', url: SITE_URL },
          { name: '\u05DE\u05D9\u05DC\u05D5\u05DF', url: `${SITE_URL}/dictionary` },
          { name: entry.hebrew_script, url: `${SITE_URL}/word/${entry.slug || encodeURIComponent(entry.hebrew_script)}` },
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
