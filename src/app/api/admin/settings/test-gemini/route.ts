import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';
import { decrypt } from '@/src/lib/encryption';

// POST /api/admin/settings/test-gemini - Test the current Gemini API key
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    let apiKey: string | null = null;
    let source = 'none';

    const [rows]: any = await pool.query(
      `SELECT encrypted_value, iv, auth_tag FROM system_settings WHERE setting_key = 'gemini_api_key'`
    );

    if (rows.length > 0) {
      try {
        apiKey = decrypt(rows[0].encrypted_value, rows[0].iv, rows[0].auth_tag);
        source = 'database';
      } catch {
        return NextResponse.json({ success: false, source: 'db', error: 'שגיאת פענוח מפתח' });
      }
    }

    if (!apiKey) {
      apiKey = process.env.GEMINI_API_KEY || null;
      if (apiKey) source = 'env';
    }

    if (!apiKey) {
      return NextResponse.json({ success: false, source: 'none', error: 'לא הוגדר מפתח API' });
    }

    // Lightweight test: list models
    const testUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(testUrl);

    if (response.ok) {
      return NextResponse.json({ success: true, source });
    } else {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        source,
        error: errorData?.error?.message || `HTTP ${response.status}`,
      });
    }
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Test Gemini error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
