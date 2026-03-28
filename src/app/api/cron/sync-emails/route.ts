import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

const EMAILIT_API_KEY = process.env.EMAILIT_API_KEY;
const DOMAIN = 'jun-juhuri.com';
const CRON_SECRET = process.env.CRON_SECRET || 'juhuri-cron-2026';

// GET /api/cron/sync-emails — called by cron every hour
export async function GET(request: NextRequest) {
  // Simple auth to prevent abuse
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!EMAILIT_API_KEY) {
    return NextResponse.json({ error: 'No API key' }, { status: 500 });
  }

  try {
    const res = await fetch('https://api.emailit.com/v2/emails?limit=100', {
      headers: { 'Authorization': `Bearer ${EMAILIT_API_KEY}` },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'EmailIt API error' }, { status: 502 });
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
      const [existing] = await pool.query('SELECT id FROM email_logs WHERE emailit_id = ?', [emailitId]) as any[];
      if (existing.length > 0) {
        // Update status if changed
        await pool.query('UPDATE email_logs SET status = ? WHERE emailit_id = ? AND status != ?',
          [email.status || 'unknown', emailitId, email.status || 'unknown']);
        continue;
      }

      const toAddr = Array.isArray(email.to) ? email.to.join(', ') : (email.to || '');
      await pool.query(
        `INSERT INTO email_logs (direction, from_address, to_address, subject, status, emailit_id, created_at)
         VALUES ('outgoing', ?, ?, ?, ?, ?, ?)`,
        [email.from || '', toAddr, email.subject || '', email.status || 'unknown', emailitId, new Date(email.created_at || Date.now()).toISOString().slice(0, 19).replace('T', ' ')]
      );
      synced++;
    }

    return NextResponse.json({ success: true, synced, checked: domainEmails.length });
  } catch (error) {
    console.error('Cron sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
