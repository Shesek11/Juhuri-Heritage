import { NextResponse } from 'next/server';
import pool from '@/src/lib/db';

export async function GET() {
  try {
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM dictionary_entries de
       JOIN dialect_scripts t ON de.id = t.entry_id
       WHERE de.status = 'active'
       AND de.hebrew_script IS NOT NULL AND TRIM(de.hebrew_script) != ''`
    ) as any[];

    if (total === 0) {
      return NextResponse.json({ word: null });
    }

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
    const offset = (dayOfYear + now.getFullYear()) % total;

    const [entries] = await pool.query(
      `SELECT de.id, de.hebrew_script, de.detected_language,
              de.hebrew_short, de.english_short, de.russian_short,
              de.hebrew_script as t_hebrew_script, t.latin_script, t.cyrillic_script,
              t.pronunciation_guide, COALESCE(d.name, '') as dialect
       FROM dictionary_entries de
       JOIN dialect_scripts t ON de.id = t.entry_id
       LEFT JOIN dialects d ON t.dialect_id = d.id
       WHERE de.status = 'active' AND de.hebrew_script IS NOT NULL AND de.hebrew_script != ''
       ORDER BY de.id
       LIMIT 1 OFFSET ?`,
      [offset]
    ) as any[];

    if (entries.length === 0) {
      return NextResponse.json({ word: null });
    }

    const entry = (entries as any[])[0];
    return NextResponse.json({
      word: {
        id: entry.id,
        hebrewScript: entry.hebrew_script,
        detectedLanguage: entry.detected_language,
        hebrewShort: entry.hebrew_short || null,
        englishShort: entry.english_short || null,
        russianShort: entry.russian_short || null,
        dialectScripts: [{
          dialect: entry.dialect,
          hebrewScript: entry.t_hebrew_script,
          latinScript: entry.latin_script,
          cyrillicScript: entry.cyrillic_script,
          pronunciationGuide: entry.pronunciation_guide,
        }]
      }
    });
  } catch (error) {
    console.error('Word of day error:', error);
    return NextResponse.json({ error: 'Error loading word of the day' }, { status: 500 });
  }
}
