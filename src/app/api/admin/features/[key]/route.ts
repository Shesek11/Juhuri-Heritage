import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';

// PUT /api/admin/features/:key - Update a feature flag status (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const user = await requireAdmin(request);
    const { key } = await params;
    const { status } = await request.json();

    if (!['active', 'admin_only', 'coming_soon', 'disabled'].includes(status)) {
      return NextResponse.json({ error: 'סטטוס לא תקין' }, { status: 400 });
    }

    const [result]: any = await pool.query(
      'UPDATE feature_flags SET status = ? WHERE feature_key = ?',
      [status, key]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "פיצ'ר לא נמצא" }, { status: 404 });
    }

    // Log the change
    await pool.query(
      `INSERT INTO system_logs (event_type, description, user_id, user_name, metadata)
       VALUES ('FEATURE_FLAG_CHANGED', ?, ?, ?, ?)`,
      [
        `Feature "${key}" changed to "${status}"`,
        user.id,
        user.name,
        JSON.stringify({ feature_key: key, new_status: status }),
      ]
    );

    return NextResponse.json({ success: true, feature_key: key, status });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error updating feature flag:', error);
    return NextResponse.json({ error: "שגיאה בעדכון הפיצ'ר" }, { status: 500 });
  }
}
