import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, RATE_LIMITS } from '@/src/lib/rate-limit';
import { callGemini } from '../_shared';

export async function POST(request: NextRequest) {
  try {
    const limited = applyRateLimit(request, RATE_LIMITS.gemini);
    if (limited) return limited;

    const { topic, dialect, level, count } = await request.json();

    const lessonSchema = {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          type: { type: "STRING", enum: ['multiple_choice', 'flashcard', 'translate_he_to_ju', 'translate_ju_to_he'] },
          question: { type: "STRING" },
          options: { type: "ARRAY", items: { type: "STRING" } },
          correctAnswer: { type: "STRING" },
          audioText: { type: "STRING" },
          explanation: { type: "STRING" }
        },
        required: ["id", "type", "question", "correctAnswer"]
      }
    };

    const prompt = `Create ${count || 5} exercises for topic "${topic}". Dialect: ${dialect}. Level: ${level}. Return JSON.`;

    const result = await callGemini(prompt, null, lessonSchema);
    return NextResponse.json({ exercises: result });
  } catch (error) {
    console.error('Lesson gen error:', error);
    return NextResponse.json({ error: 'שגיאה ביצירת שיעור' }, { status: 500 });
  }
}
