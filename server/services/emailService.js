const pool = require('../config/db');

const EMAIL_API_URL = 'https://api.emailit.com/v2/emails';
const API_KEY = process.env.EMAILIT_API_KEY;
const DEFAULT_FROM = 'info@jun-juhuri.com';

/**
 * Send raw email via EmailIt API
 */
async function sendEmail({ to, subject, html, from, templateSlug }) {
    if (!API_KEY) {
        console.warn('EMAILIT_API_KEY not set, skipping email');
        return null;
    }

    const fromAddr = from || DEFAULT_FROM;
    const toList = Array.isArray(to) ? to : [to];

    const res = await fetch(EMAIL_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: fromAddr, to: toList, subject, html }),
    });

    const data = await res.json();

    // Log the email attempt
    try {
        await pool.query(
            `INSERT INTO email_logs (direction, from_address, to_address, subject, template_slug, status, emailit_id, error_message)
             VALUES ('outgoing', ?, ?, ?, ?, ?, ?, ?)`,
            [
                fromAddr,
                toList.join(', '),
                subject,
                templateSlug || null,
                res.ok ? (data.status || 'accepted') : 'failed',
                data.id || null,
                res.ok ? null : JSON.stringify(data),
            ]
        );
    } catch (logErr) {
        console.error('Failed to log email:', logErr.message);
    }

    if (!res.ok) {
        throw new Error(`EmailIt error: ${JSON.stringify(data)}`);
    }

    return data;
}

/**
 * Sanitize a value to prevent email header injection and XSS
 */
function sanitizeValue(val) {
    if (typeof val !== 'string') return val;
    // Strip characters that enable header injection
    return val.replace(/[\r\n]/g, ' ').replace(/[<>]/g, c => c === '<' ? '&lt;' : '&gt;');
}

/**
 * Replace {{variable}} placeholders in a string
 */
function interpolate(template, vars) {
    if (!template || !vars) return template;
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return vars[key] !== undefined ? sanitizeValue(vars[key]) : match;
    });
}

/**
 * Send email using a DB template by slug
 */
async function sendTemplateEmail(slug, { to, variables = {} }) {
    const [rows] = await pool.query(
        'SELECT * FROM email_templates WHERE slug = ? AND is_active = 1',
        [slug]
    );

    if (!rows.length) {
        console.warn(`Email template "${slug}" not found or inactive`);
        return null;
    }

    const template = rows[0];
    // EmailIt API only accepts plain email address, no display name
    const fromStr = template.from_email;

    const resolvedTo = to || template.to_address;
    if (!resolvedTo) {
        console.warn(`No recipient for template "${slug}"`);
        return null;
    }

    return sendEmail({
        to: resolvedTo,
        subject: interpolate(template.subject, variables),
        html: interpolate(template.html_body, variables),
        from: fromStr,
        templateSlug: slug,
    });
}

/**
 * Send feedback notification using template (falls back to inline)
 */
async function sendFeedbackNotification({ category, message, userName, userEmail, pageUrl }) {
    const adminEmail = process.env.ADMIN_EMAIL || 'jun.juhuri@gmail.com';

    const categoryLabels = {
        suggestion: 'הצעה',
        bug: 'באג',
        content: 'תוכן',
        general: 'כללי',
    };

    // Try template first
    try {
        const result = await sendTemplateEmail('contact-form', {
            to: adminEmail,
            variables: {
                category: categoryLabels[category] || category,
                userName: userName || 'אנונימי',
                userEmail: userEmail || 'לא צוין',
                message,
                pageUrl: pageUrl || '',
            },
        });
        if (result) return result;
    } catch (err) {
        console.warn('Template send failed, using inline fallback:', err.message);
    }

    // Fallback to inline HTML
    const html = `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2>הודעה חדשה מטופס יצירת קשר</h2>
            <table style="border-collapse: collapse; width: 100%;">
                <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">קטגוריה</td><td style="padding: 8px; border: 1px solid #ddd;">${categoryLabels[category] || category}</td></tr>
                ${userName ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">שם</td><td style="padding: 8px; border: 1px solid #ddd;">${userName}</td></tr>` : ''}
                ${userEmail ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">אימייל</td><td style="padding: 8px; border: 1px solid #ddd;">${userEmail}</td></tr>` : ''}
                ${pageUrl ? `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">עמוד</td><td style="padding: 8px; border: 1px solid #ddd;">${pageUrl}</td></tr>` : ''}
            </table>
            <div style="margin-top: 16px; padding: 16px; background: #f5f5f5; border-radius: 8px;">
                <p style="margin: 0; white-space: pre-wrap;">${message}</p>
            </div>
        </div>
    `;

    return sendEmail({
        to: adminEmail,
        subject: `יצירת קשר: ${categoryLabels[category] || 'כללי'} - ${userName || 'אנונימי'}`,
        html,
    });
}

module.exports = { sendEmail, sendTemplateEmail, interpolate, sendFeedbackNotification };
