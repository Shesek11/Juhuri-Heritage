import pool from './db';

const EMAILIT_API_KEY = process.env.EMAILIT_API_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'jun.juhuri@gmail.com';
const DEFAULT_FROM = 'info@jun-juhuri.com';

function sanitize(val: string): string {
  return val.replace(/[\r\n]/g, ' ').replace(/[<>]/g, c => c === '<' ? '&lt;' : '&gt;');
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return vars[key] !== undefined ? sanitize(vars[key]) : match;
  });
}

/**
 * Send a raw email via EmailIt API and log it.
 */
async function sendRawEmail({ to, subject, html, from, templateSlug }: {
  to: string; subject: string; html: string; from?: string; templateSlug?: string;
}) {
  if (!EMAILIT_API_KEY) {
    console.warn('EMAILIT_API_KEY not set, skipping email');
    return null;
  }

  const fromAddr = from || DEFAULT_FROM;
  const toList = Array.isArray(to) ? to : [to];

  const res = await fetch('https://api.emailit.com/v2/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${EMAILIT_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: fromAddr, to: toList, subject, html }),
  });

  const data = await res.json() as any;

  // Log to email_logs
  try {
    await pool.query(
      `INSERT INTO email_logs (direction, from_address, to_address, subject, template_slug, status, emailit_id, error_message)
       VALUES ('outgoing', ?, ?, ?, ?, ?, ?, ?)`,
      [fromAddr, toList.join(', '), subject, templateSlug || null,
       res.ok ? (data.status || 'accepted') : 'failed',
       data.id || null, res.ok ? null : JSON.stringify(data)]
    );
  } catch (e) {
    console.error('Failed to log email:', e);
  }

  if (!res.ok) throw new Error(`EmailIt error: ${JSON.stringify(data)}`);
  return data;
}

/**
 * Central email event dispatcher.
 * Call this from anywhere: sendEventEmail('welcome', { to: 'user@x.com', variables: { userName: 'Foo' } })
 * It looks up the template by slug, checks if active, interpolates variables, and sends.
 */
export async function sendEventEmail(
  slug: string,
  { to, variables = {} }: { to?: string; variables?: Record<string, string> }
): Promise<any> {
  // Check if there's a custom mapping for this event
  const [mappings] = await pool.query(
    `SELECT t.* FROM email_event_mappings m
     JOIN email_templates t ON t.id = m.template_id
     WHERE m.event_slug = ? AND t.is_active = 1`,
    [slug]
  ) as any[];

  let template;
  if (mappings.length) {
    template = mappings[0];
  } else {
    // Fallback: look up by slug directly
    const [rows] = await pool.query(
      'SELECT * FROM email_templates WHERE slug = ? AND is_active = 1',
      [slug]
    ) as any[];
    if (!rows.length) return null;
    template = rows[0];
  }
  const recipient = to || (template.to_type === 'admin' ? ADMIN_EMAIL : template.to_address);

  if (!recipient) {
    console.warn(`No recipient for event email "${slug}"`);
    return null;
  }

  // Auto-inject logoUrl from seo_settings if not already provided
  let logoUrl = variables.logoUrl || '';
  if (!logoUrl) {
    try {
      const [logoRows] = await pool.query(
        `SELECT setting_value FROM seo_settings WHERE setting_key = 'site_logo' LIMIT 1`
      ) as [any[], any];
      if (logoRows.length && logoRows[0].setting_value) {
        const siteUrl = process.env.SITE_URL || 'https://jun-juhuri.com';
        const val = logoRows[0].setting_value;
        logoUrl = val.startsWith('http') ? val : `${siteUrl}${val}`;
      }
    } catch {}
  }

  const fullVars = {
    ...variables,
    siteUrl: process.env.SITE_URL || 'https://jun-juhuri.com',
    siteName: 'Juhuri Heritage',
    logoUrl,
  };

  return sendRawEmail({
    to: recipient,
    subject: interpolate(template.subject, fullVars),
    html: `<html><head><meta charset="utf-8"></head><body>${interpolate(template.html_body, fullVars)}</body></html>`,
    from: template.from_email || DEFAULT_FROM,
    templateSlug: slug,
  });
}

/**
 * Convenience: send event email without blocking the caller.
 * Use this in API routes so the response isn't delayed by email sending.
 */
export function fireEventEmail(
  slug: string,
  opts: { to?: string; variables?: Record<string, string> }
): void {
  sendEventEmail(slug, opts).catch(err =>
    console.error(`Failed to send event email "${slug}":`, err.message)
  );
}
