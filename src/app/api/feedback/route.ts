import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

// POST /api/feedback - Submit feedback (public - no auth required)
export async function POST(request: NextRequest) {
  try {
    const { category, message, userName, userEmail, pageUrl } = await request.json();

    // Validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'יש להזין הודעה' }, { status: 400 });
    }

    if (message.length > 5000) {
      return NextResponse.json({ error: 'ההודעה ארוכה מדי' }, { status: 400 });
    }

    if (category && !['suggestion', 'bug', 'content', 'general'].includes(category)) {
      return NextResponse.json({ error: 'קטגוריה לא חוקית' }, { status: 400 });
    }

    if (userEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      return NextResponse.json({ error: 'כתובת אימייל לא חוקית' }, { status: 400 });
    }

    if (userName && userName.length > 100) {
      return NextResponse.json({ error: 'שם ארוך מדי' }, { status: 400 });
    }

    if (pageUrl && pageUrl.length > 500) {
      return NextResponse.json({ error: 'כתובת עמוד ארוכה מדי' }, { status: 400 });
    }

    await pool.query(
      'INSERT INTO site_feedback (category, message, user_name, user_email, page_url) VALUES (?, ?, ?, ?, ?)',
      [category || 'suggestion', message.trim(), userName?.trim() || null, userEmail?.trim() || null, pageUrl || null]
    );

    return NextResponse.json({ success: true, message: 'תודה! ההודעה נשלחה בהצלחה' });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json({ error: 'שגיאה בשליחת ההודעה' }, { status: 500 });
  }
}
