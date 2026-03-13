import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';

// GET /api/admin/seo/redirects - Get all redirects
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);

    const [redirects] = await pool.query(
      `SELECT id, from_path, to_path, status_code, hits, is_active, created_at, updated_at
       FROM seo_redirects ORDER BY created_at DESC`
    );

    return NextResponse.json(redirects);
  } catch (error) {
    if (error instanceof Response) return error;
    if ((error as any)?.code === 'ER_NO_SUCH_TABLE') {
      return NextResponse.json([]);
    }
    console.error('Redirects error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת הפניות' }, { status: 500 });
  }
}

// POST /api/admin/seo/redirects - Add redirect
export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const body = await request.json();
    const { from_path, to_path, status_code } = body;

    if (!from_path || !to_path) {
      return NextResponse.json({ error: 'נדרשים נתיב מקור ויעד' }, { status: 400 });
    }

    const code = [301, 302, 307, 308].includes(status_code) ? status_code : 301;

    const [result] = await pool.query(
      `INSERT INTO seo_redirects (from_path, to_path, status_code, created_by)
       VALUES (?, ?, ?, ?)`,
      [from_path.trim(), to_path.trim(), code, (user as any).id]
    ) as [any, any];

    return NextResponse.json({ success: true, id: result.insertId });
  } catch (error) {
    if (error instanceof Response) return error;
    if ((error as any)?.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'הפניה מנתיב זה כבר קיימת' }, { status: 400 });
    }
    console.error('Add redirect error:', error);
    return NextResponse.json({ error: 'שגיאה בהוספת הפניה' }, { status: 500 });
  }
}
