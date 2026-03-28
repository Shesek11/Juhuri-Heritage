export interface Env {
  WEBHOOK_URL: string;
}

/** Decode Quoted-Printable encoding */
function decodeQP(str: string): string {
  // Remove soft line breaks (=\r\n or =\n)
  str = str.replace(/=\r?\n/g, '');
  // Decode =XX hex sequences
  return str.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

/** Decode Base64 */
function decodeBase64(str: string): string {
  try {
    return atob(str.replace(/\s/g, ''));
  } catch {
    return str;
  }
}

/** Extract and decode a MIME part body based on its Content-Transfer-Encoding */
function decodePart(part: string): string {
  const headerEnd = part.indexOf('\r\n\r\n');
  if (headerEnd === -1) {
    const altEnd = part.indexOf('\n\n');
    if (altEnd === -1) return part;
    const headers = part.substring(0, altEnd).toLowerCase();
    const body = part.substring(altEnd + 2).trim();
    if (headers.includes('base64')) return decodeBase64(body);
    if (headers.includes('quoted-printable')) return decodeQP(body);
    return body;
  }
  const headers = part.substring(0, headerEnd).toLowerCase();
  const body = part.substring(headerEnd + 4).trim();
  if (headers.includes('base64')) return decodeBase64(body);
  if (headers.includes('quoted-printable')) return decodeQP(body);
  return body;
}

export default {
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    const from = message.from;
    const to = message.to;
    const subject = message.headers.get('subject') || '(no subject)';
    const fromName = message.headers.get('from')?.replace(/<.*>/, '').trim().replace(/^"(.*)"$/, '$1') || '';

    // Read raw email
    const rawEmail = await new Response(message.raw).text();

    let textBody = '';
    let htmlBody = '';

    const contentType = message.headers.get('content-type') || '';

    if (contentType.includes('multipart')) {
      // Handle nested multipart — find the innermost boundary
      const boundaries: string[] = [];
      const boundaryMatches = rawEmail.matchAll(/boundary="?([^"\s;]+)"?/gi);
      for (const m of boundaryMatches) boundaries.push(m[1]);

      for (const boundary of boundaries) {
        const parts = rawEmail.split(`--${boundary}`);
        for (const part of parts) {
          if (part.startsWith('--')) continue; // closing boundary
          if (part.includes('text/plain') && !textBody) {
            textBody = decodePart(part);
          } else if (part.includes('text/html') && !htmlBody) {
            htmlBody = decodePart(part);
          }
        }
      }
    } else if (contentType.includes('text/html')) {
      htmlBody = decodePart(rawEmail);
    } else {
      textBody = decodePart(rawEmail);
    }

    // Fix UTF-8: the decoded bytes may be raw UTF-8 in a latin1 string
    // Re-encode to get proper unicode
    try {
      if (htmlBody) {
        const bytes = new Uint8Array([...htmlBody].map(c => c.charCodeAt(0)));
        htmlBody = new TextDecoder('utf-8').decode(bytes);
      }
      if (textBody) {
        const bytes = new Uint8Array([...textBody].map(c => c.charCodeAt(0)));
        textBody = new TextDecoder('utf-8').decode(bytes);
      }
    } catch {
      // Keep as-is if re-encoding fails
    }

    const headers: Record<string, string> = {};
    for (const [key, value] of message.headers.entries()) {
      headers[key] = value;
    }

    try {
      await fetch(env.WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          from_name: fromName,
          to,
          subject,
          html: htmlBody || null,
          text: textBody || null,
          headers,
          spam_score: message.headers.get('x-spam-score') || null,
        }),
      });
    } catch (err) {
      console.error('Failed to send to webhook:', err);
    }

    // Forward to Gmail
    await message.forward('jun.juhuri@gmail.com');
  },
};
