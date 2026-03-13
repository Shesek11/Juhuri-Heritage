import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/auth';
import { getAnalyticsData, PROPERTY_ID, fmtDate } from '../_lib/ga-client';

// GET /api/admin/analytics/devices - Device breakdown
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
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
      },
    });

    return NextResponse.json({
      devices: (response.data.rows || []).map((r: any) => ({
        device: r.dimensionValues[0].value,
        sessions: parseInt(r.metricValues[0].value) || 0,
        users: parseInt(r.metricValues[1].value) || 0,
      })),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Analytics devices error:', (error as Error).message);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
