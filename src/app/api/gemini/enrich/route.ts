import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, RATE_LIMITS } from '@/src/lib/rate-limit';
import { callGemini, DICTIONARY_SYSTEM_INSTRUCTION } from '../_shared';

export async function POST(request: NextRequest) {
  try {
    const limited = applyRateLimit(request, RATE_LIMITS.gemini);
    if (limited) return limited;

    const { missingFields, knownFields } = await request.json();

    if (!missingFields || missingFields.length === 0) {
      return NextResponse.json({ error: 'נדרשים שדות חסרים' }, { status: 400 });
    }
    if (!knownFields || (!knownFields.russian && !knownFields.hebrew && !knownFields.latin)) {
      return NextResponse.json({ error: 'נדרש לפחות שדה אחד מוכר' }, { status: 400 });
    }

    // Build context from known fields
    const contextParts: string[] = [];
    if (knownFields.russian) contextParts.push(`Russian: "${knownFields.russian}"`);
    if (knownFields.hebrew) contextParts.push(`Hebrew script: "${knownFields.hebrew}"`);
    if (knownFields.latin) contextParts.push(`Latin transliteration: "${knownFields.latin}"`);
    if (knownFields.cyrillic) contextParts.push(`Cyrillic: "${knownFields.cyrillic}"`);
    if (knownFields.definition) contextParts.push(`Definition: "${knownFields.definition}"`);
    if (knownFields.pronunciationGuide) contextParts.push(`Pronunciation: "${knownFields.pronunciationGuide}"`);
    if (knownFields.partOfSpeech) contextParts.push(`Part of speech: "${knownFields.partOfSpeech}"`);

    const contextStr = contextParts.join('\n');
    const fieldsList = missingFields.join(', ');

    const prompt = `I have a Juhuri (Judeo-Tat) dictionary entry with the following KNOWN information:
${contextStr}

Provide ONLY the following MISSING fields: ${fieldsList}.
Do NOT repeat information I already have. Only fill in what's missing.

Field instructions:
- "hebrewTransliteration" — the Juhuri word written in Hebrew script (כתב עברי). This is a TRANSLITERATION of the Juhuri pronunciation, NOT a Hebrew translation. Example: the Juhuri word for "child" is אייל (aayil).
- "hebrew" — the Juhuri word written in Hebrew script (כתב עברי). Same as hebrewTransliteration.
- "latin" — Latin transliteration of the Juhuri word.
- "cyrillic" — the Juhuri word in Cyrillic script.
- "russian" — Russian translation/meaning of the word.
- "definition" — expanded definition in Hebrew.
- "pronunciationGuide" — pronunciation guide using LATIN characters (e.g. "aa-yil", "sho-lum"). NOT Hebrew. Use hyphens to separate syllables.
- "partOfSpeech" — part of speech in Hebrew (e.g. שם עצם, פועל, שם תואר).
- "nikud" — add full Hebrew nikud (vowel marks) to the Hebrew text provided in knownFields.hebrew. Use the Latin transliteration from knownFields.latin to determine correct vowels. Return the same Hebrew text WITH nikud added.

CRITICAL: For hebrew/hebrewTransliteration/latin/cyrillic fields, provide the JUHURI word in that script — NOT translations to those languages.`;

    // Build schema dynamically based on requested fields
    const enrichSchema: any = {
      type: "OBJECT",
      properties: {},
      required: []
    };

    if (missingFields.includes('hebrewTransliteration')) {
      enrichSchema.properties.hebrewTransliteration = { type: "STRING", description: "המילה הג'והורית בכתב עברי (תעתיק, לא תרגום)" };
    }
    if (missingFields.includes('hebrew')) {
      enrichSchema.properties.hebrew = { type: "STRING", description: "המילה הג'והורית בכתב עברי" };
    }
    if (missingFields.includes('latin')) {
      enrichSchema.properties.latin = { type: "STRING", description: "תעתיק לטיני של המילה הג'והורית" };
    }
    if (missingFields.includes('cyrillic')) {
      enrichSchema.properties.cyrillic = { type: "STRING", description: "המילה הג'והורית בכתב קירילי" };
    }
    if (missingFields.includes('russian')) {
      enrichSchema.properties.russian = { type: "STRING", description: "תרגום לרוסית" };
    }
    if (missingFields.includes('definition')) {
      enrichSchema.properties.definition = { type: "STRING", description: "הגדרה מורחבת בעברית" };
    }
    if (missingFields.includes('pronunciationGuide')) {
      enrichSchema.properties.pronunciationGuide = { type: "STRING", description: "מדריך הגייה באותיות לטיניות עם מקפים בין הברות" };
    }
    if (missingFields.includes('nikud')) {
      enrichSchema.properties.nikud = { type: "STRING", description: "המילה בכתב עברי עם ניקוד מלא" };
    }
    if (missingFields.includes('partOfSpeech')) {
      enrichSchema.properties.partOfSpeech = { type: "STRING", description: "חלק דיבר בעברית" };
    }

    const result = await callGemini(prompt, DICTIONARY_SYSTEM_INSTRUCTION, enrichSchema);
    return NextResponse.json({ enrichment: result, missingFields });
  } catch (error) {
    console.error('Gemini enrich error:', error);
    return NextResponse.json({ error: 'שגיאה בהעשרת AI' }, { status: 500 });
  }
}
