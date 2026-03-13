import crypto from 'crypto';
import pool from '@/src/lib/db';

// --- Configuration ---
const CACHE_DURATION = 7 * 24 * 60 * 60; // 7 days

const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash"
];

// --- API Key resolution: DB (encrypted) -> .env ---
let cachedApiKey: string | null = null;
let cacheExpiry = 0;
const KEY_CACHE_TTL = 5 * 60 * 1000;

async function getApiKey(): Promise<string | null> {
  if (cachedApiKey && Date.now() < cacheExpiry) {
    return cachedApiKey;
  }

  try {
    const [rows] = await pool.query(
      `SELECT encrypted_value, iv, auth_tag FROM system_settings WHERE setting_key = 'gemini_api_key'`
    ) as any[];
    if (rows.length > 0) {
      // Try to decrypt
      try {
        const { decrypt } = await import('@/src/lib/encryption');
        const key = decrypt(rows[0].encrypted_value, rows[0].iv, rows[0].auth_tag);
        if (key) {
          cachedApiKey = key;
          cacheExpiry = Date.now() + KEY_CACHE_TTL;
          return key;
        }
      } catch {
        // Decryption failed, fall through to .env
      }
    }
  } catch {
    // Table might not exist
  }

  const envKey = process.env.GEMINI_API_KEY;
  if (envKey) {
    cachedApiKey = envKey;
    cacheExpiry = Date.now() + KEY_CACHE_TTL;
  }
  return envKey || null;
}

export function invalidateApiKeyCache() {
  cachedApiKey = null;
  cacheExpiry = 0;
}

export const DICTIONARY_SYSTEM_INSTRUCTION = `
You are a world-class linguist specializing in Juhuri (Judeo-Tat), the language of Mountain Jews.

CRITICAL OUTPUT LANGUAGE REQUIREMENT:
- ALL definitions MUST be written in HEBREW (עברית), NOT English.
- ALL example sentences in the "origin" field MUST be in HEBREW.
- The "translated" field in examples shows the Juhuri translation in Hebrew script.
- NEVER use English anywhere in your response except for transliteration in Latin script.

AUTHORITY SOURCES:
1. Mordechai Agarunov - "Big Juhuri-Hebrew Dictionary"
2. Frieda Yusufova - "Grammar of the Juhuri Language"
3. Khanil Rafael - "Juhuri-Hebrew Dictionary"

DIALECTS:
- Quba (Standard): Standard phonology
- Derbent: "d" to "z" sound shift
- Vartashen (Oghuz): Older Persian forms

RULES:
- Include Hebraisms and Persian synonyms when available
- Use Hebrew Nikud for accuracy
- Provide pronunciation in Latin transliteration
- Cultural examples: hospitality, family, holidays

REMEMBER: Output definitions and examples in HEBREW only. No English text in definitions or examples.
`;

export const dictionarySchema = {
  type: "OBJECT",
  properties: {
    term: { type: "STRING", description: "המילה או הביטוי שנחפש" },
    detectedLanguage: { type: "STRING", enum: ["עברית", "ג'והורית", "אנגלית"], description: "השפה שזוהתה בקלט" },
    translations: {
      type: "ARRAY",
      description: "תרגומים לפי דיאלקטים",
      items: {
        type: "OBJECT",
        properties: {
          dialect: { type: "STRING", description: "שם הדיאלקט בעברית" },
          hebrew: { type: "STRING", description: "התרגום בכתב עברי" },
          latin: { type: "STRING", description: "התרגום בתעתיק לטיני" },
          cyrillic: { type: "STRING", description: "התרגום בכתב קירילי" },
        },
        required: ["dialect", "hebrew", "latin", "cyrillic"],
      },
    },
    definitions: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "הגדרות ופירושים בעברית בלבד"
    },
    examples: {
      type: "ARRAY",
      description: "דוגמאות שימוש - כל הטקסט בעברית",
      items: {
        type: "OBJECT",
        properties: {
          origin: { type: "STRING", description: "המשפט המקורי בעברית" },
          translated: { type: "STRING", description: "התרגום לג'והורית בעברית" },
          transliteration: { type: "STRING", description: "תעתיק לטיני" },
        },
      },
    },
    pronunciationGuide: { type: "STRING", description: "מדריך הגייה בעברית" }
  },
  required: ["term", "detectedLanguage", "translations", "definitions", "examples"],
};

export function hashQuery(query: string): string {
  return crypto.createHash('sha256').update(query.toLowerCase().trim()).digest('hex');
}

export async function checkCache(queryHash: string) {
  try {
    const [rows] = await pool.query(
      `SELECT response FROM query_cache
       WHERE query_hash = ? AND (expires_at IS NULL OR expires_at > NOW())`,
      [queryHash]
    ) as any[];
    return rows.length > 0 ? JSON.parse(rows[0].response) : null;
  } catch {
    return null;
  }
}

export async function saveToCache(queryHash: string, queryText: string, response: any) {
  try {
    await pool.query(
      `INSERT INTO query_cache (query_hash, query_text, response, expires_at)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))
       ON DUPLICATE KEY UPDATE response = ?, expires_at = DATE_ADD(NOW(), INTERVAL ? SECOND)`,
      [queryHash, queryText, JSON.stringify(response), CACHE_DURATION, JSON.stringify(response), CACHE_DURATION]
    );
  } catch (err) {
    console.error('Cache save error:', err);
  }
}

export async function callGemini(contentsParts: any, systemInstruction: string | null, responseSchema: any) {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("API key not configured");

  let lastError: Error | null = null;
  const TIMEOUT_MS = 15000;

  for (const model of MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

      const body: any = {
        contents: Array.isArray(contentsParts) ? contentsParts : [{ parts: [{ text: contentsParts }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 0,
          maxOutputTokens: 2048
        }
      };

      if (systemInstruction) {
        body.systemInstruction = { parts: [{ text: systemInstruction }] };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify(body),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error((errorData as any)?.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) throw new Error("Empty response from Gemini");

        return JSON.parse(text);
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        if (fetchErr.name === 'AbortError') {
          throw new Error(`Timeout after ${TIMEOUT_MS}ms`);
        }
        throw fetchErr;
      }
    } catch (err: any) {
      console.warn(`Model ${model} failed: ${err.message}`);
      lastError = err;
    }
  }

  throw lastError || new Error("All models failed");
}
