import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';
import { fireEventEmail } from '@/src/lib/email';
import { logEvent } from '@/src/lib/logEvent';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    // Parse form data or JSON
    let translationId, dialect, hebrew, latin, cyrillic, reason, audioDuration;
    let audioUrl = null;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      translationId = formData.get('translationId') as string;
      dialect = formData.get('dialect') as string;
      hebrew = formData.get('hebrew') as string;
      latin = formData.get('latin') as string;
      cyrillic = formData.get('cyrillic') as string;
      reason = formData.get('reason') as string;
      audioDuration = formData.get('audioDuration') as string;

      const audioFile = formData.get('audio') as File | null;
      if (audioFile) {
        // In Next.js, file uploads need different handling.
        // For now, store as base64 or use a separate upload endpoint.
        // The audio URL pattern from Express was /uploads/suggestion-audio/...
        // TODO: Implement file storage (e.g., to public/uploads or cloud storage)
        audioUrl = null;
      }
    } else {
      const body = await request.json();
      translationId = body.translationId;
      dialect = body.dialect;
      hebrew = body.hebrew;
      latin = body.latin;
      cyrillic = body.cyrillic;
      reason = body.reason;
      audioDuration = body.audioDuration;
    }

    if (!hebrew || !hebrew.trim()) {
      return NextResponse.json({ error: 'נדרש תרגום' }, { status: 400 });
    }
    if (!dialect || !dialect.trim()) {
      return NextResponse.json({ error: 'נדרש ניב' }, { status: 400 });
    }

    await pool.query(
      `INSERT INTO translation_suggestions
       (entry_id, translation_id, user_id, user_name, dialect, suggested_hebrew_short, suggested_latin_script, suggested_cyrillic_script, reason, audio_url, audio_duration)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, translationId || null, user.id, user.name, dialect, hebrew, latin || '', cyrillic || '', reason || '', audioUrl, audioDuration || null]
    );

    const xpAmount = audioUrl ? 30 : 20;
    await pool.query('UPDATE users SET xp = xp + ? WHERE id = ?', [xpAmount, user.id]);

    fireEventEmail('suggestion-submitted', { variables: { userName: user.name, entryId: id, dialect: dialect || '', hebrew: hebrew || '' } });

    await logEvent('DICTIONARY_SUGGESTION', `Translation suggestion for entry ${id}`, user, { entryId: id, dialect, hebrew }, request);

    return NextResponse.json({ success: true, message: 'ההצעה נשלחה לאישור' });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Suggest error:', error);
    return NextResponse.json({ error: 'שגיאה בשליחת הצעה' }, { status: 500 });
  }
}
