import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';

// PUT /api/admin/seo/redirects/:id/toggle - Toggle redirect active/inactive
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin(request);
    const { id } = await params;

    await pool.query(
      'UPDATE seo_redirects SET is_active = NOT is_active WHERE id = ?',
      [id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Toggle redirect error:', error);
    return NextResponse.json({ error: 'שגיאה בעדכון הפניה' }, { status: 500 });
  }
}
