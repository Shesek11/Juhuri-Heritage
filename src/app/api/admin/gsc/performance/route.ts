import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/auth';
import { getSearchConsole, SITE_URL, fmtDate } from '../_lib/gsc-client';

// GET /api/admin/gsc/performance - Performance data (clicks, impressions, CTR, position)
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);

    const sc = getSearchConsole();
    const days = parseInt(request.nextUrl.searchParams.get('days') || '28');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const response = await sc.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate: fmtDate(startDate),
        endDate: fmtDate(endDate),
        dimensions: ['date'],
        rowLimit: days,
      },
    });

    // Calculate totals
    const rows = response.data.rows || [];
    const totals = rows.reduce(
      (acc: any, row: any) => ({
        clicks: acc.clicks + (row.clicks || 0),
        impressions: acc.impressions + (row.impressions || 0),
        ctr: 0,
        position: 0,
      }),
      { clicks: 0, impressions: 0, ctr: 0, position: 0 }
    );

    if (totals.impressions > 0) {
      totals.ctr = totals.clicks / totals.impressions;
    }
    if (rows.length > 0) {
      totals.position = rows.reduce((sum: number, r: any) => sum + (r.position || 0), 0) / rows.length;
    }

    return NextResponse.json({
      totals,
      daily: rows.map((r: any) => ({
        date: r.keys[0],
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: r.ctr || 0,
        position: r.position || 0,
      })),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('GSC performance error:', (error as Error).message);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
