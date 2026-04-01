import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10') || 10;

    const [rows] = await pool.query(
      `SELECT de.id, de.hebrew_script, de.detected_language, de.created_at,
              de.hebrew_short, de.english_short, de.russian_short,
              de.hebrew_script as t_hebrew_script, t.latin_script, t.cyrillic_script
       FROM dictionary_entries de
       LEFT JOIN dialect_scripts t ON de.id = t.entry_id
       WHERE de.status = 'active'
       GROUP BY de.id
       ORDER BY de.created_at DESC
       LIMIT ?`,
      [limit]
    ) as any[];

    const entries = (rows as any[]).map((e: any) => ({
      id: e.id,
      hebrewScript: e.hebrew_script || e.t_hebrew_script,
      detectedLanguage: e.detected_language,
      createdAt: e.created_at,
      hebrewShort: e.hebrew_short || e.t_hebrew_script,
      englishShort: e.english_short || null,
      russianShort: e.russian_short || null,
      latinScript: e.latin_script || null,
      cyrillicScript: e.cyrillic_script || null,
    }));

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Recent entries error:', error);
    return NextResponse.json({ error: 'Error loading recent entries' }, { status: 500 });
  }
}
