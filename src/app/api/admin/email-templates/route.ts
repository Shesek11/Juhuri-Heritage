import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';
import { logEvent } from '@/src/lib/logEvent';

// GET /api/admin/email-templates
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const [templates] = await pool.query(
      `SELECT id, slug, name, subject, html_body, from_name, from_email,
              to_type, to_address, variables, is_active, created_at, updated_at
       FROM email_templates ORDER BY name ASC`
    );

    return NextResponse.json(templates);
  } catch (error) {
    if (error instanceof Response) return error;
    if ((error as any)?.code === 'ER_NO_SUCH_TABLE') {
      return NextResponse.json([]);
    }
    console.error('Email templates error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת תבניות' }, { status: 500 });
  }
}

// POST /api/admin/email-templates
export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const body = await request.json();
    const { slug, name, subject, html_body, from_name, from_email, to_type, to_address, variables, is_active } = body;

    if (!slug || !name || !subject || !html_body) {
      return NextResponse.json({ error: 'חסרים שדות חובה: slug, name, subject, html_body' }, { status: 400 });
    }

    const [result] = await pool.query(
      `INSERT INTO email_templates (slug, name, subject, html_body, from_name, from_email, to_type, to_address, variables, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        slug.trim(),
        name.trim(),
        subject.trim(),
        html_body,
        from_name || 'Juhuri Heritage',
        from_email || 'info@jun-juhuri.com',
        to_type || 'admin',
        to_address || null,
        variables ? JSON.stringify(variables) : null,
        is_active !== undefined ? is_active : true,
      ]
    ) as [any, any];

    await logEvent('EMAIL_TEMPLATE_CREATED', `תבנית אימייל חדשה: ${slug}`, user, { slug, name: name.trim() }, request);

    return NextResponse.json({ success: true, id: result.insertId });
  } catch (error) {
    if (error instanceof Response) return error;
    if ((error as any)?.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'תבנית עם slug זה כבר קיימת' }, { status: 400 });
    }
    console.error('Add template error:', error);
    return NextResponse.json({ error: 'שגיאה בהוספת תבנית' }, { status: 500 });
  }
}
