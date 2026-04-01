import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';
import { logEvent } from '@/src/lib/logEvent';

// GET /api/admin/email-templates/:id
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const [rows] = await pool.query(
      'SELECT * FROM email_templates WHERE id = ?',
      [id]
    ) as [any[], any];

    if (!rows.length) {
      return NextResponse.json({ error: 'תבנית לא נמצאה' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Get template error:', error);
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 });
  }
}

// PUT /api/admin/email-templates/:id
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const { slug, name, subject, html_body, from_name, from_email, to_type, to_address, variables, is_active } = body;

    if (!name || !subject || !html_body) {
      return NextResponse.json({ error: 'חסרים שדות חובה' }, { status: 400 });
    }

    await pool.query(
      `UPDATE email_templates
       SET slug = ?, name = ?, subject = ?, html_body = ?, from_name = ?, from_email = ?,
           to_type = ?, to_address = ?, variables = ?, is_active = ?
       WHERE id = ?`,
      [
        slug?.trim(),
        name.trim(),
        subject.trim(),
        html_body,
        from_name || 'Juhuri Heritage',
        from_email || 'info@jun-juhuri.com',
        to_type || 'admin',
        to_address || null,
        variables ? JSON.stringify(variables) : null,
        is_active !== undefined ? is_active : true,
        id,
      ]
    );

    await logEvent('EMAIL_TEMPLATE_UPDATED', `תבנית אימייל עודכנה: ${slug || id}`, user, { templateId: id, slug }, request);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    if ((error as any)?.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'תבנית עם slug זה כבר קיימת' }, { status: 400 });
    }
    console.error('Update template error:', error);
    return NextResponse.json({ error: 'שגיאה בעדכון' }, { status: 500 });
  }
}

// DELETE /api/admin/email-templates/:id
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdmin(request);
    const { id } = await params;

    await pool.query('DELETE FROM email_templates WHERE id = ?', [id]);

    await logEvent('EMAIL_TEMPLATE_DELETED', `תבנית אימייל נמחקה: ${id}`, user, { templateId: id }, request);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Delete template error:', error);
    return NextResponse.json({ error: 'שגיאה במחיקה' }, { status: 500 });
  }
}
