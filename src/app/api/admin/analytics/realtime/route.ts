import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/auth';
import { getAnalyticsData, PROPERTY_ID } from '../_lib/ga-client';

// GET /api/admin/analytics/realtime - Active users right now
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);

    if (!PROPERTY_ID) {
      return NextResponse.json({ error: 'GA_PROPERTY_ID not configured' }, { status: 400 });
    }

    const ad = getAnalyticsData();

    const response = await ad.properties.runRealtimeReport({
      property: `properties/${PROPERTY_ID}`,
      requestBody: {
        metrics: [{ name: 'activeUsers' }],
      },
    });

    const activeUsers = response.data.rows?.[0]?.metricValues?.[0]?.value || '0';

    return NextResponse.json({ activeUsers: parseInt(activeUsers) });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Analytics realtime error:', (error as Error).message);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
