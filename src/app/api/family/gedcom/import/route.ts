import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'לא נבחר קובץ' }, { status: 400 });
    }

    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.ged') && !ext.endsWith('.gedcom')) {
      return NextResponse.json({ error: 'קובץ חייב להיות בפורמט GEDCOM (.ged או .gedcom)' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'הקובץ גדול מדי (מקסימום 10MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    console.log(`Importing GEDCOM file: ${file.name} (${file.size} bytes)`);

    // Import the gedcom service
    const gedcomService = require('@/server/services/gedcomService');
    const results = await gedcomService.importGedcom(buffer, user.id);

    console.log('GEDCOM import results:', results);

    return NextResponse.json({
      success: true,
      message: `יובאו ${results.individuals} אנשים ו-${results.families} משפחות`,
      ...results
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('GEDCOM import failed:', error);
    return NextResponse.json({ error: 'שגיאה בייבוא הקובץ: ' + error.message }, { status: 500 });
  }
}
