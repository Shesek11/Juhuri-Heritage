import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/auth';
import { getSearchConsole, SITE_URL, fmtDate } from '../_lib/gsc-client';

// GET /api/admin/gsc/queries - Top queries
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);

    const sc = getSearchConsole();
    const days = parseInt(request.nextUrl.searchParams.get('days') || '28');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const response = await sc.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate: fmtDate(startDate),
        endDate: fmtDate(endDate),
        dimensions: ['query'],
        rowLimit: limit,
      } as any,
    });

    return NextResponse.json({
      queries: (response.data.rows || []).map((r: any) => ({
        query: r.keys[0],
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: r.ctr || 0,
        position: r.position || 0,
      })),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('GSC queries error:', (error as Error).message);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
