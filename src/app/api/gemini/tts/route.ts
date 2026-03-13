import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, RATE_LIMITS } from '@/src/lib/rate-limit';

export async function POST(request: NextRequest) {
  const limited = applyRateLimit(request, RATE_LIMITS.gemini);
  if (limited) return limited;

  try {
    const { text } = await request.json();
    if (!text) return NextResponse.json({ error: 'Text required' }, { status: 400 });

    const lang = /[א-ת]/.test(text) ? 'iw' : 'en';
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`TTS Fetch failed: ${response.statusText}`);

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return NextResponse.json({ audioData: base64 });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json({ error: 'שגיאת שרת ב-TTS' }, { status: 500 });
  }
}
