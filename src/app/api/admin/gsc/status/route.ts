import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/auth';
import path from 'path';
import { existsSync } from 'fs';

const SITE_URL = process.env.SITE_URL || 'https://jun-juhuri.com';

// GET /api/admin/gsc/status - Check if GSC is configured
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);

    const keyPath = path.join(process.cwd(), 'gsc-service-account.json');
    const configured = existsSync(keyPath);

    return NextResponse.json({ configured, siteUrl: SITE_URL });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 });
  }
}
