import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireRole } from '@/src/lib/auth';

// GET /api/admin/inbound-emails — list inbound emails
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);

    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search');
    const isRead = searchParams.get('is_read');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = (page - 1) * limit;

    const conditions: string[] = ['is_archived = 0'];
    const params: any[] = [];

    if (isRead === 'true') { conditions.push('is_read = 1'); }
    else if (isRead === 'false') { conditions.push('is_read = 0'); }

    if (search) {
      conditions.push('(from_address LIKE ? OR from_name LIKE ? OR subject LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM inbound_emails ${where}`, params) as any[];
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT id, from_address, from_name, to_address, subject, is_read, spam_score, created_at
       FROM inbound_emails ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return NextResponse.json({ emails: rows, total, page, limit });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Inbound emails error:', error);
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 });
  }
}
