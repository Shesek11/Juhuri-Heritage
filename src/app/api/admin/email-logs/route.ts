import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireRole } from '@/src/lib/auth';

const EMAILIT_API_KEY = process.env.EMAILIT_API_KEY;
const DOMAIN = 'jun-juhuri.com';

// GET /api/admin/email-logs — list email logs (local DB + optional EmailIt sync)
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);

    const { searchParams } = request.nextUrl;
    const source = searchParams.get('source'); // 'local' | 'emailit' | default both
    const direction = searchParams.get('direction');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = (page - 1) * limit;

    // If requesting EmailIt data directly
    if (source === 'emailit') {
      return fetchFromEmailIt(search);
    }

    // Local DB query
    const conditions: string[] = [];
    const params: any[] = [];

    if (direction && direction !== 'all') {
      conditions.push('direction = ?');
      params.push(direction);
    }
    if (status && status !== 'all') {
      conditions.push('status = ?');
      params.push(status);
    }
    if (search) {
      conditions.push('(from_address LIKE ? OR to_address LIKE ? OR subject LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM email_logs ${where}`, params) as any[];
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT id, direction, from_address, to_address, subject, template_slug, status, emailit_id, error_message, created_at
       FROM email_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return NextResponse.json({ logs: rows, total, page, limit });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Email logs error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת לוגים' }, { status: 500 });
  }
}

// POST /api/admin/email-logs — sync from EmailIt API to local DB
export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);

    if (!EMAILIT_API_KEY) {
      return NextResponse.json({ error: 'EmailIt API key not configured' }, { status: 500 });
    }

    // Fetch recent emails from EmailIt
    const res = await fetch('https://api.emailit.com/v2/emails?limit=100', {
      headers: { 'Authorization': `Bearer ${EMAILIT_API_KEY}` },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch from EmailIt' }, { status: 502 });
    }

    const emails = await res.json();
    const domainEmails = (Array.isArray(emails) ? emails : emails.data || [])
      .filter((e: any) => {
        const from = e.from || '';
        const to = Array.isArray(e.to) ? e.to.join(',') : (e.to || '');
        return from.includes(DOMAIN) || to.includes(DOMAIN);
      });

    let synced = 0;
    for (const email of domainEmails) {
      const emailitId = email.id;
      // Skip if already exists
      const [existing] = await pool.query('SELECT id FROM email_logs WHERE emailit_id = ?', [emailitId]) as any[];
      if (existing.length > 0) continue;

      const toAddr = Array.isArray(email.to) ? email.to.join(', ') : (email.to || '');
      await pool.query(
        `INSERT INTO email_logs (direction, from_address, to_address, subject, status, emailit_id, created_at)
         VALUES ('outgoing', ?, ?, ?, ?, ?, ?)`,
        [email.from || '', toAddr, email.subject || '', email.status || 'unknown', emailitId, new Date(email.created_at || Date.now()).toISOString().slice(0, 19).replace('T', ' ')]
      );
      synced++;
    }

    return NextResponse.json({ success: true, synced, total: domainEmails.length });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Email sync error:', error);
    return NextResponse.json({ error: 'שגיאה בסנכרון' }, { status: 500 });
  }
}

async function fetchFromEmailIt(search?: string | null) {
  if (!EMAILIT_API_KEY) {
    return NextResponse.json({ logs: [], total: 0 });
  }

  const res = await fetch('https://api.emailit.com/v2/emails?limit=100', {
    headers: { 'Authorization': `Bearer ${EMAILIT_API_KEY}` },
  });

  if (!res.ok) {
    return NextResponse.json({ logs: [], total: 0, error: 'EmailIt API error' });
  }

  const emails = await res.json();
  let filtered = (Array.isArray(emails) ? emails : emails.data || [])
    .filter((e: any) => {
      const from = e.from || '';
      const to = Array.isArray(e.to) ? e.to.join(',') : (e.to || '');
      return from.includes(DOMAIN) || to.includes(DOMAIN);
    })
    .map((e: any) => ({
      id: e.id,
      direction: 'outgoing',
      from_address: e.from || '',
      to_address: Array.isArray(e.to) ? e.to.join(', ') : (e.to || ''),
      subject: e.subject || '',
      template_slug: null,
      status: e.status || 'unknown',
      emailit_id: e.id,
      error_message: null,
      created_at: e.created_at,
    }));

  if (search) {
    const term = search.toLowerCase();
    filtered = filtered.filter((e: any) =>
      e.from_address.toLowerCase().includes(term) ||
      e.to_address.toLowerCase().includes(term) ||
      e.subject.toLowerCase().includes(term)
    );
  }

  return NextResponse.json({ logs: filtered, total: filtered.length, source: 'emailit' });
}
