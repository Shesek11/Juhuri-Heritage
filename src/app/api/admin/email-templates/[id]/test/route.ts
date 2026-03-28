import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';

const EMAIL_API_URL = 'https://api.emailit.com/v2/emails';

// POST /api/admin/email-templates/:id/test - Send test email
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const { testEmail } = body;

    if (!testEmail) {
      return NextResponse.json({ error: 'נדרשת כתובת מייל לבדיקה' }, { status: 400 });
    }

    const [rows] = await pool.query(
      'SELECT * FROM email_templates WHERE id = ?',
      [id]
    ) as [any[], any];

    if (!rows.length) {
      return NextResponse.json({ error: 'תבנית לא נמצאה' }, { status: 404 });
    }

    const template = rows[0];
    const apiKey = process.env.EMAILIT_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'EMAILIT_API_KEY not configured' }, { status: 500 });
    }

    // Replace variables with example values
    let html = template.html_body;
    let subject = template.subject;
    const vars = template.variables ? (typeof template.variables === 'string' ? JSON.parse(template.variables) : template.variables) : [];
    for (const v of vars) {
      const placeholder = `{{${v}}}`;
      const example = `[${v}]`;
      html = html.replaceAll(placeholder, example);
      subject = subject.replaceAll(placeholder, example);
    }

    subject = `[בדיקה] ${subject}`;

    const fromStr = template.from_name
      ? `${template.from_name} <${template.from_email}>`
      : template.from_email;

    const res = await fetch(EMAIL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromStr,
        to: [testEmail],
        subject,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: `EmailIt: ${JSON.stringify(data)}` }, { status: 502 });
    }

    return NextResponse.json({ success: true, message: `מייל בדיקה נשלח ל-${testEmail}` });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Test email error:', error);
    return NextResponse.json({ error: 'שגיאה בשליחת מייל בדיקה' }, { status: 500 });
  }
}
