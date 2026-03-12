import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireRole } from '@/src/lib/auth';

// PUT /api/recipes/admin/tags/:id - Update tag (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(request, ['admin']);
    const { id } = await params;
    const body = await request.json();
    const { name, name_hebrew, icon, color, category } = body;

    if (!name || !name_hebrew) {
      return NextResponse.json(
        { error: 'שם ושם בעברית הם שדות חובה' },
        { status: 400 }
      );
    }

    await pool.query(
      'UPDATE recipe_tags SET name = ?, name_hebrew = ?, icon = ?, color = ?, category = ? WHERE id = ?',
      [name, name_hebrew, icon || '', color || '#F59E0B', category || 'general', id]
    );

    return NextResponse.json({
      success: true,
      message: 'התגית עודכנה בהצלחה',
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error updating tag:', error);
    if ((error as any)?.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'תגית עם שם זה כבר קיימת' }, { status: 400 });
    }
    return NextResponse.json({ error: 'שגיאה בעדכון התגית' }, { status: 500 });
  }
}

// DELETE /api/recipes/admin/tags/:id - Delete tag (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(request, ['admin']);
    const { id } = await params;

    // Check if tag is in use
    const [usage] = await pool.query(
      'SELECT COUNT(*) as count FROM recipe_tag_map WHERE tag_id = ?',
      [id]
    ) as [any[], any];

    if (usage[0].count > 0) {
      return NextResponse.json(
        { error: `לא ניתן למחוק תגית זו - היא בשימוש ב-${usage[0].count} מתכונים` },
        { status: 400 }
      );
    }

    await pool.query('DELETE FROM recipe_tags WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: 'התגית נמחקה בהצלחה',
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error deleting tag:', error);
    return NextResponse.json({ error: 'שגיאה במחיקת התגית' }, { status: 500 });
  }
}
