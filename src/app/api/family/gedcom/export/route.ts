import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const gedcomService = require('@/server/services/gedcomService');
    const gedcomContent = await gedcomService.exportGedcom(user.id);

    return new NextResponse(gedcomContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename="family_tree.ged"',
      },
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('GEDCOM export failed:', error);
    return NextResponse.json({ error: 'שגיאה בייצוא הקובץ: ' + error.message }, { status: 500 });
  }
}
