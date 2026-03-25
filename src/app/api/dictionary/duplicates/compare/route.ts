import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireApprover(request);

    const ids = (request.nextUrl.searchParams.get('ids') || '').split(',').map(Number).filter(n => n > 0);
    if (ids.length < 2) {
      return NextResponse.json({ error: 'נדרשים לפחות 2 מזהי ערכים' }, { status: 400 });
    }

    const placeholders = ids.map(() => '?').join(',');

    const [
      [entries],
      [translations],
      [definitions],
      [examples],
      [likesData],
      [commentsData],
      [viewsData]
    ] = await Promise.all([
      pool.query(
        `SELECT de.*, u.name as contributor_name
         FROM dictionary_entries de
         LEFT JOIN users u ON de.contributor_id = u.id
         WHERE de.id IN (${placeholders})`, ids
      ),
      pool.query(
        `SELECT t.*, COALESCE(d.name, '') as dialect
         FROM translations t LEFT JOIN dialects d ON t.dialect_id = d.id
         WHERE t.entry_id IN (${placeholders})`, ids
      ),
      pool.query(`SELECT * FROM definitions WHERE entry_id IN (${placeholders})`, ids),
      pool.query(`SELECT * FROM examples WHERE entry_id IN (${placeholders})`, ids),
      pool.query(
        `SELECT entry_id, COUNT(*) as count FROM entry_likes WHERE entry_id IN (${placeholders}) GROUP BY entry_id`, ids
      ),
      pool.query(
        `SELECT entry_id, COUNT(*) as count FROM comments WHERE entry_id IN (${placeholders}) AND status = 'approved' GROUP BY entry_id`, ids
      ),
      pool.query(
        `SELECT entry_id, SUM(view_count) as total_views FROM word_views WHERE entry_id IN (${placeholders}) GROUP BY entry_id`, ids
      ),
    ]) as any[];

    const likesMap = Object.fromEntries(likesData.map((r: any) => [r.entry_id, r.count]));
    const commentsMap = Object.fromEntries(commentsData.map((r: any) => [r.entry_id, r.count]));
    const viewsMap = Object.fromEntries(viewsData.map((r: any) => [r.entry_id, r.total_views]));

    const result = entries.map((e: any) => ({
      id: String(e.id),
      term: e.term,
      termNormalized: e.term_normalized,
      detectedLanguage: e.detected_language,
      pronunciationGuide: e.pronunciation_guide,
      partOfSpeech: e.part_of_speech,
      russian: e.russian,
      english: e.english,
      source: e.source,
      sourceName: e.source_name,
      status: e.status,
      contributorName: e.contributor_name,
      createdAt: e.created_at,
      translations: translations.filter((t: any) => t.entry_id === e.id).map((t: any) => ({
        id: t.id, dialect: t.dialect, dialectId: t.dialect_id,
        hebrew: t.hebrew, latin: t.latin, cyrillic: t.cyrillic,
        upvotes: t.upvotes || 0, downvotes: t.downvotes || 0,
      })),
      definitions: definitions.filter((d: any) => d.entry_id === e.id).map((d: any) => d.definition),
      examples: examples.filter((ex: any) => ex.entry_id === e.id).map((ex: any) => ({
        origin: ex.origin, translated: ex.translated, transliteration: ex.transliteration,
      })),
      likesCount: likesMap[e.id] || 0,
      commentsCount: commentsMap[e.id] || 0,
      totalViews: viewsMap[e.id] || 0,
    }));

    return NextResponse.json({ entries: result });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error('Compare entries error:', err);
    return NextResponse.json({ error: 'שגיאה בהשוואת ערכים' }, { status: 500 });
  }
}
