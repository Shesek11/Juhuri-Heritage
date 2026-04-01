import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireRole } from '@/src/lib/auth';
import { fireEventEmail } from '@/src/lib/email';
import { logEvent } from '@/src/lib/logEvent';

// POST /api/recipes/admin/:id/approve - Approve recipe (admin/moderator)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(request, ['admin', 'moderator']);
    const { id } = await params;

    await pool.query('UPDATE recipes SET is_approved = 1 WHERE id = ?', [id]);

    await logEvent('RECIPE_APPROVED', `מתכון ${id} אושר`, user, { recipe_id: id }, request);

    // Notify the recipe author
    const [recipeRows] = await pool.query(
      'SELECT r.title, u.email, u.name FROM recipes r JOIN users u ON r.user_id = u.id WHERE r.id = ?', [id]
    ) as [any[], any];
    if (recipeRows.length && recipeRows[0].email) {
      fireEventEmail('recipe-approved', { to: recipeRows[0].email, variables: { userName: recipeRows[0].name || '', recipeTitle: recipeRows[0].title || '', recipeId: id } });
    }

    return NextResponse.json({ success: true, message: 'המתכון אושר' });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error approving recipe:', error);
    return NextResponse.json({ error: 'שגיאה באישור המתכון' }, { status: 500 });
  }
}
