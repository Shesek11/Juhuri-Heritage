import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireRole } from '@/src/lib/auth';

// GET /api/recipes/admin/pending - Get pending recipes (admin/moderator)
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, ['admin', 'moderator']);

    const [recipes] = await pool.query(`
      SELECT r.*, u.name as author_name
      FROM recipes r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.is_approved = 0
      ORDER BY r.created_at DESC
    `);

    return NextResponse.json(recipes);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error fetching pending recipes:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת מתכונים ממתינים' }, { status: 500 });
  }
}
