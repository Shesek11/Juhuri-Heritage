import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';
import { encrypt } from '@/src/lib/encryption';
import { logEvent } from '@/src/lib/logEvent';

// Allowed setting keys (whitelist)
const ALLOWED_KEYS = ['gemini_api_key'];

/**
 * Mask a sensitive value for display.
 */
function maskValue(value: string): string {
  if (!value || value.length <= 10) return '***';
  return value.substring(0, 6) + '...' + value.substring(value.length - 3);
}

// PUT /api/admin/settings/:key - Create or update a setting
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const user = await requireAdmin(request);
    const { key } = await params;
    const { value, description } = await request.json();

    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      return NextResponse.json({ error: 'ערך לא תקין' }, { status: 400 });
    }

    if (!ALLOWED_KEYS.includes(key)) {
      return NextResponse.json({ error: 'מפתח הגדרה לא מורשה' }, { status: 400 });
    }

    const { encrypted, iv, authTag } = encrypt(value.trim());

    await pool.query(
      `INSERT INTO system_settings (setting_key, encrypted_value, iv, auth_tag, description, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
          encrypted_value = VALUES(encrypted_value),
          iv = VALUES(iv),
          auth_tag = VALUES(auth_tag),
          description = VALUES(description),
          updated_by = VALUES(updated_by),
          updated_at = CURRENT_TIMESTAMP`,
      [key, encrypted, iv, authTag, description || null, user.id]
    );

    await logEvent('SETTING_CHANGED', `הגדרה "${key}" עודכנה`, user, { setting_key: key }, request);

    return NextResponse.json({ success: true, setting_key: key, masked_value: maskValue(value.trim()) });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error saving setting:', error);
    return NextResponse.json({ error: 'שגיאה בשמירת הגדרה' }, { status: 500 });
  }
}

// DELETE /api/admin/settings/:key - Remove a setting (revert to .env)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const user = await requireAdmin(request);
    const { key } = await params;

    const [result]: any = await pool.query(
      'DELETE FROM system_settings WHERE setting_key = ?',
      [key]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'הגדרה לא נמצאה' }, { status: 404 });
    }

    await logEvent('SETTING_DELETED', `הגדרה "${key}" נמחקה (חזרה ל-.env)`, user, { setting_key: key }, request);

    return NextResponse.json({ success: true, message: 'הגדרה נמחקה, המערכת תשתמש ב-.env' });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error deleting setting:', error);
    return NextResponse.json({ error: 'שגיאה במחיקת הגדרה' }, { status: 500 });
  }
}
