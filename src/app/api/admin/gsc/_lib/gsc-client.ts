import { google } from 'googleapis';
import path from 'path';
import { existsSync } from 'fs';

let searchConsole: ReturnType<typeof google.searchconsole> | null = null;

export function getSearchConsole() {
  if (searchConsole) return searchConsole;

  const keyPath = path.join(process.cwd(), 'gsc-service-account.json');
  if (!existsSync(keyPath)) {
    throw new Error('GSC service account key not found');
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });

  searchConsole = google.searchconsole({ version: 'v1', auth });
  return searchConsole;
}

export const SITE_URL = process.env.SITE_URL || 'https://jun-juhuri.com';

export function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0];
}
