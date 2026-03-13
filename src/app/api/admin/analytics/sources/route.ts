import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/auth';
import { getAnalyticsData, PROPERTY_ID, fmtDate } from '../_lib/ga-client';

// GET /api/admin/analytics/sources - Traffic sources
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);

    if (!PROPERTY_ID) {
      return NextResponse.json({ error: 'GA_PROPERTY_ID not configured' }, { status: 400 });
    }

    const ad = getAnalyticsData();
    const days = parseInt(request.nextUrl.searchParams.get('days') || '28');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const response = await ad.properties.runReport({
      property: `properties/${PROPERTY_ID}`,
      requestBody: {
        dateRanges: [{ startDate: fmtDate(startDate), endDate: fmtDate(endDate) }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: '10',
      },
    });

    return NextResponse.json({
      sources: (response.data.rows || []).map((r: any) => ({
        channel: r.dimensionValues[0].value,
        sessions: parseInt(r.metricValues[0].value) || 0,
        users: parseInt(r.metricValues[1].value) || 0,
      })),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Analytics sources error:', (error as Error).message);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
