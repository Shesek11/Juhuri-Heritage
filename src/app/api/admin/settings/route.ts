import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';
import { decrypt } from '@/src/lib/encryption';

/**
 * Mask a sensitive value for display.
 * Shows first 6 and last 3 characters: "AIzaSy...Rqw"
 */
function maskValue(value: string): string {
  if (!value || value.length <= 10) return '***';
  return value.substring(0, 6) + '...' + value.substring(value.length - 3);
}

// GET /api/admin/settings - Get all settings (masked values only)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const [settings]: any = await pool.query(
      `SELECT setting_key, encrypted_value, iv, auth_tag, description, updated_at
       FROM system_settings ORDER BY setting_key ASC`
    );

    const result = settings.map((s: any) => {
      let maskedValue = '***';
      try {
        const decrypted = decrypt(s.encrypted_value, s.iv, s.auth_tag);
        maskedValue = maskValue(decrypted);
      } catch {
        maskedValue = '[שגיאת פענוח]';
      }
      return {
        setting_key: s.setting_key,
        masked_value: maskedValue,
        description: s.description,
        updated_at: s.updated_at,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת הגדרות' }, { status: 500 });
  }
}
