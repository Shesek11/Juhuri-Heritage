import { google } from 'googleapis';
import path from 'path';
import { existsSync } from 'fs';

let analyticsData: ReturnType<typeof google.analyticsdata> | null = null;

export function getAnalyticsData() {
  if (analyticsData) return analyticsData;

  const keyPath = path.join(process.cwd(), 'gsc-service-account.json');
  if (!existsSync(keyPath)) {
    throw new Error('Service account key not found');
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });

  analyticsData = google.analyticsdata({ version: 'v1beta', auth });
  return analyticsData;
}

export const PROPERTY_ID = process.env.GA_PROPERTY_ID || '';

export function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0];
}
