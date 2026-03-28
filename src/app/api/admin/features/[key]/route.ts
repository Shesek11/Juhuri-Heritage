import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';
import { logEvent } from '@/src/lib/logEvent';

// PUT /api/admin/features/:key - Update a feature flag status (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const user = await requireAdmin(request);
    const { key } = await params;
    const body = await request.json();
    const { status, name, description } = body;

    // Build dynamic update
    const updates: string[] = [];
    const values: any[] = [];

    if (status) {
      if (!['active', 'admin_only', 'coming_soon', 'disabled'].includes(status)) {
        return NextResponse.json({ error: 'סטטוס לא תקין' }, { status: 400 });
      }
      updates.push('status = ?');
      values.push(status);
    }
    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'אין שדות לעדכון' }, { status: 400 });
    }

    values.push(key);
    const [result]: any = await pool.query(
      `UPDATE feature_flags SET ${updates.join(', ')} WHERE feature_key = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "פיצ'ר לא נמצא" }, { status: 404 });
    }

    await logEvent('FEATURE_FLAG_CHANGED', `Feature "${key}" changed to "${status}"`, user, { feature_key: key, new_status: status, name, description }, request);

    return NextResponse.json({ success: true, feature_key: key, status });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error updating feature flag:', error);
    return NextResponse.json({ error: "שגיאה בעדכון הפיצ'ר" }, { status: 500 });
  }
}
