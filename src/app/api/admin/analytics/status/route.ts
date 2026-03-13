import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/auth';
import path from 'path';
import { existsSync } from 'fs';

const PROPERTY_ID = process.env.GA_PROPERTY_ID || '';

// GET /api/admin/analytics/status - Check if Analytics is configured
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);

    const keyPath = path.join(process.cwd(), 'gsc-service-account.json');
    const configured = existsSync(keyPath) && !!PROPERTY_ID;

    return NextResponse.json({
      configured,
      propertyId: PROPERTY_ID ? `***${PROPERTY_ID.slice(-4)}` : null,
      measurementId: process.env.GA_MEASUREMENT_ID || null,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 });
  }
}
