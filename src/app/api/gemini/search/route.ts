import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, RATE_LIMITS } from '@/src/lib/rate-limit';
import { callGemini, DICTIONARY_SYSTEM_INSTRUCTION, dictionarySchema, hashQuery, checkCache, saveToCache } from '../_shared';

export async function POST(request: NextRequest) {
  try {
    const limited = applyRateLimit(request, RATE_LIMITS.gemini);
    if (limited) return limited;

    const { query } = await request.json();
    if (!query) return NextResponse.json({ error: 'נדרש מונח לחיפוש' }, { status: 400 });

    const queryHash = hashQuery(query);
    const cached = await checkCache(queryHash);
    if (cached) return NextResponse.json({ entry: cached, cached: true });

    const result = await callGemini(query, DICTIONARY_SYSTEM_INSTRUCTION, dictionarySchema);

    await saveToCache(queryHash, query, result);
    return NextResponse.json({ entry: result, cached: false });
  } catch (error) {
    console.error('Gemini search error:', error);
    return NextResponse.json({ error: 'שגיאה בחיפוש AI' }, { status: 500 });
  }
}
