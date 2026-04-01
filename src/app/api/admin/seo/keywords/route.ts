import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';

// GET /api/admin/seo/keywords
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const [rows] = await pool.query(
      `SELECT * FROM seo_keywords ORDER BY language, priority DESC, monthly_volume DESC`
    );
    return NextResponse.json(rows);
  } catch (error) {
    if (error instanceof Response) return error;
    if ((error as any)?.code === 'ER_NO_SUCH_TABLE') return NextResponse.json([]);
    return NextResponse.json({ error: 'שגיאה בטעינת מילות מפתח' }, { status: 500 });
  }
}

// POST /api/admin/seo/keywords
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { keyword, language, monthly_volume, target_page, priority, notes } = await request.json();

    if (!keyword || !language) {
      return NextResponse.json({ error: 'נדרש מילת מפתח ושפה' }, { status: 400 });
    }

    const [result] = await pool.query(
      `INSERT INTO seo_keywords (keyword, language, monthly_volume, target_page, priority, notes)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE monthly_volume = VALUES(monthly_volume), target_page = VALUES(target_page),
         priority = VALUES(priority), notes = VALUES(notes)`,
      [keyword, language, monthly_volume || null, target_page || null, priority || 'medium', notes || null]
    ) as any;

    return NextResponse.json({ id: result.insertId, success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: 'שגיאה בשמירת מילת מפתח' }, { status: 500 });
  }
}

// PUT /api/admin/seo/keywords - Update keyword
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { id, keyword, language, monthly_volume, current_position, target_page, priority, notes } = await request.json();

    if (!id) return NextResponse.json({ error: 'נדרש ID' }, { status: 400 });

    await pool.query(
      `UPDATE seo_keywords SET keyword = ?, language = ?, monthly_volume = ?, current_position = ?,
       target_page = ?, priority = ?, notes = ? WHERE id = ?`,
      [keyword, language, monthly_volume || null, current_position || null, target_page || null, priority || 'medium', notes || null, id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: 'שגיאה בעדכון מילת מפתח' }, { status: 500 });
  }
}

// DELETE /api/admin/seo/keywords
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'נדרש ID' }, { status: 400 });

    await pool.query('DELETE FROM seo_keywords WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: 'שגיאה במחיקת מילת מפתח' }, { status: 500 });
  }
}
