import { NextResponse } from 'next/server';
import pool from '@/src/lib/db';

// Stats cache
let statsCache: { data: any; expiry: number } = { data: null, expiry: 0 };
const STATS_CACHE_TTL = 2 * 60 * 1000;

export async function GET() {
  try {
    const now = Date.now();
    if (statsCache.data && now < statsCache.expiry) {
      return NextResponse.json(statsCache.data);
    }

    const [
      [[hebrewOnly]],
      [[juhuriOnly]],
      [[{ dialectCount }]],
      [[totalActive]],
      [[recentEntries]]
    ] = await Promise.all([
      pool.query(`
        SELECT COUNT(DISTINCT de.id) as count FROM dictionary_entries de
        JOIN dialect_scripts t ON de.id = t.entry_id
        WHERE de.status = 'active'
        AND t.hebrew_script IS NOT NULL AND t.hebrew_script != ''
        AND (t.latin_script IS NULL OR t.latin_script = '')
      `),
      pool.query(`
        SELECT COUNT(DISTINCT de.id) as count FROM dictionary_entries de
        JOIN dialect_scripts t ON de.id = t.entry_id
        WHERE de.status = 'active'
        AND de.detected_language = 'Juhuri'
        AND (t.hebrew_script IS NULL OR t.hebrew_script = '')
      `),
      pool.query('SELECT COUNT(*) as dialectCount FROM dialects'),
      pool.query(`SELECT COUNT(*) as count FROM dictionary_entries WHERE status = 'active'`),
      pool.query(`
        SELECT COUNT(*) as count FROM dictionary_entries
        WHERE status = 'active' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      `)
    ]) as any[];

    const [[missingDialects]] = await pool.query(`
      SELECT COUNT(*) as count FROM (
          SELECT de.id, COUNT(DISTINCT t.dialect_id) as dialect_count
          FROM dictionary_entries de
          JOIN dialect_scripts t ON de.id = t.entry_id
          WHERE de.status = 'active'
          GROUP BY de.id
          HAVING dialect_count < ?
      ) sub
    `, [dialectCount]) as any[];

    const [[missingAudio]] = await pool.query(`
      SELECT COUNT(DISTINCT de.id) as count FROM dictionary_entries de
      LEFT JOIN dialect_scripts t ON de.id = t.entry_id
      WHERE de.status = 'active'
      AND (t.pronunciation_guide IS NOT NULL AND t.pronunciation_guide != '')
    `) as any[];

    let pendingCount = 0;
    try {
      const [[pending]] = await pool.query(`
        SELECT COUNT(*) as count FROM translation_suggestions WHERE status = 'pending'
      `) as any[];
      pendingCount = pending.count;
    } catch {
      // Table might not exist
    }

    const data = {
      hebrewOnlyCount: hebrewOnly.count,
      juhuriOnlyCount: juhuriOnly.count,
      missingDialectsCount: missingDialects.count,
      missingAudioCount: missingAudio.count,
      totalActiveCount: totalActive.count,
      recentCount: recentEntries.count,
      pendingCount
    };

    statsCache = { data, expiry: now + STATS_CACHE_TTL };
    return NextResponse.json(data);
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת סטטיסטיקות' }, { status: 500 });
  }
}
