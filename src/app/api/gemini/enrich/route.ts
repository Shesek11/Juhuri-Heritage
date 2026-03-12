import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, RATE_LIMITS } from '@/src/lib/rate-limit';
import { callGemini, DICTIONARY_SYSTEM_INSTRUCTION } from '../_shared';

export async function POST(request: NextRequest) {
  try {
    const limited = applyRateLimit(request, RATE_LIMITS.gemini);
    if (limited) return limited;

    const { term, hebrew, missingFields } = await request.json();
    if (!term || !missingFields || missingFields.length === 0) {
      return NextResponse.json({ error: 'נדרש מונח ושדות חסרים' }, { status: 400 });
    }

    const fieldsList = missingFields.join(', ');
    const prompt = `For the Juhuri word "${term}" (Hebrew: "${hebrew || ''}"), provide ONLY the following missing fields: ${fieldsList}.
Do NOT repeat information I already have. Only fill in what's missing.
If the field is "latin" - provide Latin transliteration of the Juhuri word.
If the field is "cyrillic" - provide Cyrillic script of the Juhuri word.
If the field is "examples" - provide 2-3 usage examples.
If the field is "pronunciationGuide" - provide pronunciation guide.
If the field is "definition" - expand the definition in Hebrew.`;

    const enrichSchema: any = {
      type: "OBJECT",
      properties: {},
      required: []
    };

    if (missingFields.includes('latin')) {
      enrichSchema.properties.latin = { type: "STRING", description: "תעתיק לטיני של המילה הג'והורית" };
    }
    if (missingFields.includes('cyrillic')) {
      enrichSchema.properties.cyrillic = { type: "STRING", description: "המילה בכתב קירילי" };
    }
    if (missingFields.includes('examples')) {
      enrichSchema.properties.examples = {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            origin: { type: "STRING", description: "משפט בעברית" },
            translated: { type: "STRING", description: "תרגום לג'והורית" },
            transliteration: { type: "STRING", description: "תעתיק לטיני" },
          },
        },
      };
    }
    if (missingFields.includes('pronunciationGuide')) {
      enrichSchema.properties.pronunciationGuide = { type: "STRING", description: "מדריך הגייה" };
    }
    if (missingFields.includes('definition')) {
      enrichSchema.properties.definition = { type: "STRING", description: "הגדרה מורחבת בעברית" };
    }

    const result = await callGemini(prompt, DICTIONARY_SYSTEM_INSTRUCTION, enrichSchema);
    return NextResponse.json({ enrichment: result, missingFields });
  } catch (error) {
    console.error('Gemini enrich error:', error);
    return NextResponse.json({ error: 'שגיאה בהעשרת AI' }, { status: 500 });
  }
}
