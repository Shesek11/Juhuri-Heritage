import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/auth';
import { getAnalyticsData, PROPERTY_ID, fmtDate } from '../_lib/ga-client';

// GET /api/admin/analytics/overview - Sessions, users, pageviews, bounce rate
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
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
        ],
        orderBys: [{ dimension: { dimensionName: 'date', orderType: 'ALPHANUMERIC' } }],
      },
    });

    const rows = response.data.rows || [];
    const daily = rows.map((r: any) => ({
      date: r.dimensionValues[0].value.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
      sessions: parseInt(r.metricValues[0].value) || 0,
      users: parseInt(r.metricValues[1].value) || 0,
      pageviews: parseInt(r.metricValues[2].value) || 0,
      avgDuration: parseFloat(r.metricValues[3].value) || 0,
      bounceRate: parseFloat(r.metricValues[4].value) || 0,
    }));

    const totals = daily.reduce(
      (acc: any, d: any) => ({
        sessions: acc.sessions + d.sessions,
        users: acc.users + d.users,
        pageviews: acc.pageviews + d.pageviews,
      }),
      { sessions: 0, users: 0, pageviews: 0 }
    ) as any;

    totals.avgDuration =
      daily.length > 0 ? daily.reduce((s: number, d: any) => s + d.avgDuration, 0) / daily.length : 0;
    totals.bounceRate =
      daily.length > 0 ? daily.reduce((s: number, d: any) => s + d.bounceRate, 0) / daily.length : 0;

    return NextResponse.json({ totals, daily });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Analytics overview error:', (error as Error).message);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
