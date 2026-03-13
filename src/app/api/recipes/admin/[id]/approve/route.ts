import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireRole } from '@/src/lib/auth';

// POST /api/recipes/admin/:id/approve - Approve recipe (admin/moderator)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(request, ['admin', 'moderator']);
    const { id } = await params;

    await pool.query('UPDATE recipes SET is_approved = 1 WHERE id = ?', [id]);

    // Log the action
    await pool.query(
      `INSERT INTO system_logs (event_type, description, user_id, user_name, metadata)
       VALUES ('APPROVAL', ?, ?, ?, ?)`,
      ['Recipe approved', (user as any).id, (user as any).name, JSON.stringify({ recipe_id: id })]
    );

    return NextResponse.json({ success: true, message: 'המתכון אושר' });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error approving recipe:', error);
    return NextResponse.json({ error: 'שגיאה באישור המתכון' }, { status: 500 });
  }
}
