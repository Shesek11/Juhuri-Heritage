import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';

// GET /api/logs - Get system logs (Admin/Approver only)
export async function GET(request: NextRequest) {
  try {
    await requireApprover(request);

    const sp = request.nextUrl.searchParams;
    const limit = sp.get('limit');
    const eventType = sp.get('eventType');
    const userId = sp.get('userId');
    const from = sp.get('from');
    const to = sp.get('to');
    const search = sp.get('search');

    let query = `
      SELECT sl.*, u.name as actor_name, u.email as actor_email
      FROM system_logs sl
      LEFT JOIN users u ON sl.user_id = u.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (eventType) {
      conditions.push('sl.event_type = ?');
      params.push(eventType);
    }
    if (userId) {
      conditions.push('sl.user_id = ?');
      params.push(parseInt(userId));
    }
    if (from) {
      conditions.push('sl.created_at >= ?');
      params.push(from);
    }
    if (to) {
      conditions.push('sl.created_at <= ?');
      params.push(to + ' 23:59:59');
    }
    if (search) {
      conditions.push('sl.description LIKE ?');
      params.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY sl.created_at DESC LIMIT ?';
    params.push(Math.min(parseInt(limit || '200') || 200, 500));

    const [rows] = await pool.query(query, params);

    // Always return full user list for the filter combobox
    const [allUsers] = await pool.query('SELECT id, name, email FROM users ORDER BY name');

    const logs = (rows as any[]).map(r => ({
      id: String(r.id),
      type: r.event_type,
      description: r.description,
      userId: r.user_id ? String(r.user_id) : null,
      userName: r.actor_name || r.user_name || null,
      userEmail: r.actor_email || null,
      timestamp: r.created_at ? new Date(r.created_at).toISOString() : null,
      ipAddress: r.ip_address || null,
      metadata: r.metadata ? (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) : null,
    }));

    const users = (allUsers as any[]).map(u => ({
      id: String(u.id),
      name: u.name,
      email: u.email,
    }));

    return NextResponse.json({ logs, users });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Get logs error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת לוגים' }, { status: 500 });
  }
}
