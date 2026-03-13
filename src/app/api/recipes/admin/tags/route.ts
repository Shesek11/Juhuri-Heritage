import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireRole } from '@/src/lib/auth';

// POST /api/recipes/admin/tags - Create new tag (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['admin']);
    const body = await request.json();
    const { name, name_hebrew, icon, color, category } = body;

    if (!name || !name_hebrew) {
      return NextResponse.json(
        { error: 'שם ושם בעברית הם שדות חובה' },
        { status: 400 }
      );
    }

    const [result] = await pool.query(
      'INSERT INTO recipe_tags (name, name_hebrew, icon, color, category) VALUES (?, ?, ?, ?, ?)',
      [name, name_hebrew, icon || '', color || '#F59E0B', category || 'general']
    ) as [any, any];

    return NextResponse.json({
      success: true,
      tag_id: result.insertId,
      message: 'התגית נוצרה בהצלחה',
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error creating tag:', error);
    if ((error as any)?.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'תגית עם שם זה כבר קיימת' }, { status: 400 });
    }
    return NextResponse.json({ error: 'שגיאה ביצירת התגית' }, { status: 500 });
  }
}
