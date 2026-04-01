import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireRole } from '@/src/lib/auth';
import { fireEventEmail } from '@/src/lib/email';
import { logEvent } from '@/src/lib/logEvent';

// POST /api/recipes/admin/:id/reject - Reject recipe (admin/moderator)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(request, ['admin', 'moderator']);
    const { id } = await params;
    const { reason } = await request.json().catch(() => ({ reason: '' }));

    // Get recipe info before deleting
    const [recipeRows] = await pool.query(
      'SELECT r.title, r.user_id, u.email, u.name FROM recipes r LEFT JOIN users u ON r.user_id = u.id WHERE r.id = ?', [id]
    ) as [any[], any];

    await pool.query('DELETE FROM recipes WHERE id = ?', [id]);

    await logEvent('RECIPE_REJECTED', `מתכון ${id} נדחה`, user, { recipe_id: id, reason }, request);

    // Notify the recipe author
    if (recipeRows.length && recipeRows[0].email) {
      fireEventEmail('recipe-rejected', {
        to: recipeRows[0].email,
        variables: { userName: recipeRows[0].name || '', recipeTitle: recipeRows[0].title || '', reason: reason || '' },
      });
    }

    return NextResponse.json({ success: true, message: 'המתכון נדחה' });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error rejecting recipe:', error);
    return NextResponse.json({ error: 'שגיאה בדחיית המתכון' }, { status: 500 });
  }
}
