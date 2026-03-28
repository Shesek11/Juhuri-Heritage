import crypto from 'crypto';
import pool from '@/src/lib/db';
import { callGemini } from '@/src/app/api/gemini/_shared';

function md5(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}

const LOCALES = ['en', 'ru'] as const;
const LOCALE_NAMES: Record<string, string> = {
  en: 'English',
  ru: 'Russian',
};

/**
 * Auto-translate a title to EN + RU on content creation/update.
 * Called from API routes that create or update recipes, vendors, music, etc.
 * Non-blocking — errors are logged but don't fail the parent operation.
 */
export async function autoTranslateTitle(
  contentType: 'recipe' | 'page' | 'vendor' | 'music',
  contentId: string,
  hebrewTitle: string
): Promise<void> {
  if (!hebrewTitle?.trim()) return;

  try {
    const hash = md5(hebrewTitle);

    // Check if translations already exist and are fresh
    const [existing] = await pool.query(
      `SELECT locale, original_hash FROM ai_translations
       WHERE content_type = ? AND content_id = ? AND field_name = 'title' AND locale IN ('en', 'ru')`,
      [contentType, contentId]
    ) as any[];

    const existingMap = new Map<string, string>();
    for (const row of existing) {
      existingMap.set(row.locale, row.original_hash);
    }

    // Only translate locales that are missing or stale
    const localesToTranslate = LOCALES.filter(
      locale => !existingMap.has(locale) || existingMap.get(locale) !== hash
    );

    if (localesToTranslate.length === 0) return;

    // Translate to all needed locales in one Gemini call
    const targetLangs = localesToTranslate.map(l => LOCALE_NAMES[l]).join(' and ');
    const systemPrompt = `Translate this Hebrew title to ${targetLangs}. This is from a Juhuri (Mountain Jewish) heritage website. Return a JSON object with locale codes as keys.`;

    const responseSchema = {
      type: 'OBJECT',
      properties: Object.fromEntries(
        localesToTranslate.map(l => [l, { type: 'STRING' }])
      ),
    };

    const result = await callGemini(hebrewTitle, systemPrompt, responseSchema);
    const translated = typeof result === 'string' ? JSON.parse(result) : result;

    // Save each translation
    for (const locale of localesToTranslate) {
      const translatedText = translated[locale];
      if (!translatedText) continue;

      await pool.query(
        `INSERT INTO ai_translations (content_type, content_id, field_name, locale, original_hash, translated_text, auto_translated)
         VALUES (?, ?, 'title', ?, ?, ?, TRUE)
         ON DUPLICATE KEY UPDATE translated_text = VALUES(translated_text), original_hash = VALUES(original_hash), auto_translated = TRUE, updated_at = NOW()`,
        [contentType, contentId, locale, hash, translatedText]
      );
    }
  } catch (error) {
    // Non-blocking — log but don't throw
    console.error(`Auto-translate title failed for ${contentType}/${contentId}:`, error);
  }
}
