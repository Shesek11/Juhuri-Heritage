import { NextRequest, NextResponse } from 'next/server';
import { callGemini } from '../_shared';
import { applyRateLimit, RATE_LIMITS } from '@/src/lib/rate-limit';

export async function POST(request: NextRequest) {
  const limited = applyRateLimit(request, RATE_LIMITS.gemini);
  if (limited) return limited;

  try {
    const { fields, direction } = await request.json();

    if (!fields || !direction) {
      return NextResponse.json({ error: 'Missing fields or direction' }, { status: 400 });
    }

    const fromLang = direction === 'he-to-ru' ? 'Hebrew' : 'Russian';
    const toLang = direction === 'he-to-ru' ? 'Russian' : 'Hebrew';

    const fieldEntries = Object.entries(fields).filter(([, v]) => v && (v as string).trim());
    if (fieldEntries.length === 0) {
      return NextResponse.json({});
    }

    const fieldList = fieldEntries.map(([key, val]) => `"${key}": "${val}"`).join('\n');

    const systemInstruction = `You are a name transliteration expert for the Mountain Jewish (Juhuri) community.
Transliterate the following personal names and place names from ${fromLang} to ${toLang}.
For names: use standard transliteration conventions (e.g., Hebrew שלום → Russian Шалом, Hebrew כהן → Russian Коэн).
For places: use the commonly known ${toLang} name (e.g., Hebrew באקו → Russian Баку, Hebrew ישראל → Russian Израиль).
Return ONLY the transliterated values as a JSON object with the same keys.`;

    const result = await callGemini(
      `Transliterate these fields from ${fromLang} to ${toLang}:\n${fieldList}`,
      systemInstruction,
      {
        type: "OBJECT",
        properties: Object.fromEntries(fieldEntries.map(([key]) => [key, { type: "STRING" }]))
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Transliteration error:', error);
    return NextResponse.json({ error: 'שגיאה בתעתיק' }, { status: 500 });
  }
}
