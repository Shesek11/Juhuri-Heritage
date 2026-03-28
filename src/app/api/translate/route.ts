import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import crypto from 'crypto';
import { callGemini } from '@/src/app/api/gemini/_shared';

const LOCALE_NAMES: Record<string, string> = {
  en: 'English',
  ru: 'Russian',
};

function md5(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}

// GET: Check if translation exists and if it's stale
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const contentType = searchParams.get('content_type');
  const contentId = searchParams.get('content_id');
  const locale = searchParams.get('locale');
  const fields = searchParams.get('fields'); // comma-separated field names

  if (!contentType || !contentId || !locale || !fields) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const fieldList = fields.split(',');

  try {
    const [rows] = await pool.query(
      `SELECT field_name, translated_text, original_hash, auto_translated, created_at
       FROM ai_translations
       WHERE content_type = ? AND content_id = ? AND locale = ? AND field_name IN (?)`,
      [contentType, contentId, locale, fieldList]
    ) as any[];

    const translations: Record<string, { text: string; hash: string; auto: boolean; date: string }> = {};
    for (const row of rows) {
      translations[row.field_name] = {
        text: row.translated_text,
        hash: row.original_hash,
        auto: row.auto_translated,
        date: row.created_at,
      };
    }

    return NextResponse.json({ translations });
  } catch (error) {
    console.error('Translation fetch error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST: Translate content on demand
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content_type, content_id, locale, fields } = body;
    // fields: Record<string, string> — field_name → Hebrew source text

    if (!content_type || !content_id || !locale || !fields || typeof fields !== 'object') {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    if (!LOCALE_NAMES[locale]) {
      return NextResponse.json({ error: 'Unsupported locale' }, { status: 400 });
    }

    const targetLang = LOCALE_NAMES[locale];
    const fieldEntries = Object.entries(fields) as [string, string][];

    // Check cache first — only translate fields that are missing or stale
    const fieldNames = fieldEntries.map(([k]) => k);
    const [cached] = await pool.query(
      `SELECT field_name, translated_text, original_hash FROM ai_translations
       WHERE content_type = ? AND content_id = ? AND locale = ? AND field_name IN (?)`,
      [content_type, content_id, locale, fieldNames]
    ) as any[];

    const cacheMap = new Map<string, { text: string; hash: string }>();
    for (const row of cached) {
      cacheMap.set(row.field_name, { text: row.translated_text, hash: row.original_hash });
    }

    const toTranslate: [string, string][] = [];
    const result: Record<string, string> = {};

    for (const [fieldName, sourceText] of fieldEntries) {
      if (!sourceText?.trim()) continue;
      const currentHash = md5(sourceText);
      const cached = cacheMap.get(fieldName);
      if (cached && cached.hash === currentHash) {
        result[fieldName] = cached.text;
      } else {
        toTranslate.push([fieldName, sourceText]);
      }
    }

    // If everything is cached and fresh, return immediately
    if (toTranslate.length === 0) {
      return NextResponse.json({ translations: result, fromCache: true });
    }

    // Build Gemini prompt for all fields at once
    const fieldsText = toTranslate
      .map(([name, text]) => `[${name}]\n${text}`)
      .join('\n\n');

    const systemPrompt = `You are a professional translator. Translate the following Hebrew text to ${targetLang}.
The content is from a Juhuri (Mountain Jewish) heritage website. Preserve cultural terms, proper nouns, and formatting.
Return a JSON object where each key is the field name (from the [field_name] headers) and the value is the translated text.
Translate naturally — this is not a word-for-word translation.`;

    const responseSchema = {
      type: 'OBJECT',
      properties: Object.fromEntries(
        toTranslate.map(([name]) => [name, { type: 'STRING' }])
      ),
    };

    const geminiResult = await callGemini(fieldsText, systemPrompt, responseSchema);
    const translated = typeof geminiResult === 'string' ? JSON.parse(geminiResult) : geminiResult;

    // Save translations to cache
    for (const [fieldName, sourceText] of toTranslate) {
      const translatedText = translated[fieldName];
      if (!translatedText) continue;

      result[fieldName] = translatedText;
      const hash = md5(sourceText);

      await pool.query(
        `INSERT INTO ai_translations (content_type, content_id, field_name, locale, original_hash, translated_text, auto_translated)
         VALUES (?, ?, ?, ?, ?, ?, FALSE)
         ON DUPLICATE KEY UPDATE translated_text = VALUES(translated_text), original_hash = VALUES(original_hash), updated_at = NOW()`,
        [content_type, content_id, fieldName, locale, hash, translatedText]
      );
    }

    return NextResponse.json({ translations: result, fromCache: false });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
