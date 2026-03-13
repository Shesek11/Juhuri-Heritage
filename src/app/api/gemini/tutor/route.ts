import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, RATE_LIMITS } from '@/src/lib/rate-limit';
import { callGemini } from '../_shared';

export async function POST(request: NextRequest) {
  try {
    const limited = applyRateLimit(request, RATE_LIMITS.gemini);
    if (limited) return limited;

    const { history, config, message } = await request.json();

    const tutorSchema = {
      type: "OBJECT",
      properties: {
        content: { type: "STRING" },
        audioText: { type: "STRING" }
      },
      required: ["content"]
    };

    const TUTOR_INSTRUCTION = `
You are "Saba Mordechai", a wise, patient, and warm private tutor for the Juhuri language.
Current Config: Dialect=${config?.dialect || 'Quba'}, Level=${config?.level || 'Beginner'}.
Rules: Strict dialect adherence, level adaptation, and always use Nikud for Hebrew script.
`;

    const contents = (history || []).map((h: any) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    }));

    contents.push({ role: 'user', parts: [{ text: message }] });

    const result = await callGemini(contents, TUTOR_INSTRUCTION, tutorSchema);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Tutor error:', error);
    return NextResponse.json({ error: 'שגיאה במורה פרטי' }, { status: 500 });
  }
}
