import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, RATE_LIMITS } from '@/src/lib/rate-limit';
import { callGemini, DICTIONARY_SYSTEM_INSTRUCTION, dictionarySchema } from '../_shared';

export async function POST(request: NextRequest) {
  try {
    const limited = applyRateLimit(request, RATE_LIMITS.gemini);
    if (limited) return limited;

    const { audioData, mimeType } = await request.json();
    if (!audioData) return NextResponse.json({ error: 'נדרש קובץ שמע' }, { status: 400 });

    const properParts = [
      { inlineData: { mimeType: mimeType || 'audio/webm', data: audioData } },
      { text: "Transcribe and translate to JSON. Strict dictionary format." }
    ];

    const result = await callGemini([{ parts: properParts }], DICTIONARY_SYSTEM_INSTRUCTION, dictionarySchema);
    return NextResponse.json({ entry: result });
  } catch (error) {
    console.error('Gemini audio error:', error);
    return NextResponse.json({ error: 'שגיאה בזיהוי שמע' }, { status: 500 });
  }
}
