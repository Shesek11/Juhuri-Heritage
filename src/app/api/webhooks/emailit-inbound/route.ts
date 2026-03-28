import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

// POST /api/webhooks/emailit-inbound — receives inbound emails from EmailIt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const from = body.from || body.sender || '';
    const fromName = body.from_name || '';
    const to = body.to || body.recipient || '';
    const subject = body.subject || '(no subject)';
    const htmlBody = body.html || body.body_html || null;
    const textBody = body.text || body.body_plain || null;
    const headers = body.headers || null;
    const attachments = body.attachments || null;
    const spamScore = body.spam_score ?? null;

    await pool.query(
      `INSERT INTO inbound_emails (from_address, from_name, to_address, subject, html_body, text_body, headers, attachments, spam_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [from, fromName, to, subject, htmlBody, textBody, headers ? JSON.stringify(headers) : null, attachments ? JSON.stringify(attachments) : null, spamScore]
    );

    // Also log in email_logs
    await pool.query(
      `INSERT INTO email_logs (direction, from_address, to_address, subject, status) VALUES ('incoming', ?, ?, ?, 'received')`,
      [from, to, subject]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Inbound email webhook error:', error);
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 });
  }
}
