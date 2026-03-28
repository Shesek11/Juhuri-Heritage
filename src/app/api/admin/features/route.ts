import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';

// GET /api/admin/features - Get all feature flags (Admin only)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const [flags] = await pool.query(
      'SELECT * FROM feature_flags ORDER BY sort_order ASC, name ASC'
    );
    return NextResponse.json(flags);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error fetching feature flags:', error);
    return NextResponse.json({ error: "שגיאה בטעינת הגדרות הפיצ'רים" }, { status: 500 });
  }
}

// PUT /api/admin/features - Reorder features
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { order } = await request.json(); // [{ feature_key: string, sort_order: number }]

    if (!Array.isArray(order)) {
      return NextResponse.json({ error: 'Invalid order format' }, { status: 400 });
    }

    for (const item of order) {
      await pool.query(
        'UPDATE feature_flags SET sort_order = ? WHERE feature_key = ?',
        [item.sort_order, item.feature_key]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error reordering features:', error);
    return NextResponse.json({ error: 'שגיאה בעדכון סדר' }, { status: 500 });
  }
}
