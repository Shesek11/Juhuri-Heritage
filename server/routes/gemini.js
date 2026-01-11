const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../config/db');

// --- Configuration ---
const API_KEY = process.env.GEMINI_API_KEY;
const CACHE_DURATION = 7 * 24 * 60 * 60; // 7 days

// Models to try in order of preference
const MODELS = [
    "gemini-3-flash-preview",          // Gemini 3 Flash (latest)
    "gemini-2.5-flash-preview-05-20",  // Fallback 2.5
    "gemini-2.0-flash"                 // Stable fallback
];

// --- Schemas & Instructions ---
// (Kept identical to preserve logic)
const DICTIONARY_SYSTEM_INSTRUCTION = `
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

const dictionarySchema = {
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

// --- Helpers ---

const hashQuery = (query) => {
    return crypto.createHash('sha256').update(query.toLowerCase().trim()).digest('hex');
};

const checkCache = async (queryHash) => {
    try {
        const [rows] = await db.query(
            `SELECT response FROM query_cache 
             WHERE query_hash = ? AND (expires_at IS NULL OR expires_at > NOW())`,
            [queryHash]
        );
        return rows.length > 0 ? JSON.parse(rows[0].response) : null;
    } catch (err) {
        console.error('Cache check error:', err);
        return null;
    }
};

const saveToCache = async (queryHash, queryText, response) => {
    try {
        await db.query(
            `INSERT INTO query_cache (query_hash, query_text, response, expires_at) 
             VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))
             ON DUPLICATE KEY UPDATE response = ?, expires_at = DATE_ADD(NOW(), INTERVAL ? SECOND)`,
            [queryHash, queryText, JSON.stringify(response), CACHE_DURATION, JSON.stringify(response), CACHE_DURATION]
        );
    } catch (err) {
        console.error('Cache save error:', err);
    }
};

/**
 * Executes a Gemini API call using native fetch with automatic model fallback.
 * Optimized with timeout, temperature, and token limits.
 */
async function callGemini(contentsParts, systemInstruction, responseSchema) {
    if (!API_KEY) throw new Error("GEMINI_API_KEY is missing");

    let lastError = null;
    const TIMEOUT_MS = 30000; // 30 second timeout per model

    for (const model of MODELS) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

            const body = {
                contents: Array.isArray(contentsParts) ? contentsParts : [{ parts: [{ text: contentsParts }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                    temperature: 0,        // Faster, more consistent responses
                    maxOutputTokens: 2048  // Limit output size for speed
                }
            };

            if (systemInstruction) {
                body.systemInstruction = { parts: [{ text: systemInstruction }] };
            }

            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData?.error?.message || `HTTP ${response.status}`);
                }

                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

                if (!text) throw new Error("Empty response from Gemini");

                return JSON.parse(text); // Success!

            } catch (fetchErr) {
                clearTimeout(timeoutId);
                if (fetchErr.name === 'AbortError') {
                    throw new Error(`Timeout after ${TIMEOUT_MS}ms`);
                }
                throw fetchErr;
            }

        } catch (err) {
            // console.warn(`Model ${model} failed: ${err.message}`);
            lastError = err;
            // Continue to next model in loop
        }
    }

    throw lastError || new Error("All models failed");
}


// --- Routes ---

// POST /api/gemini/search
router.post('/search', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'נדרש מונח לחיפוש' });

        const queryHash = hashQuery(query);
        const cached = await checkCache(queryHash);
        if (cached) return res.json({ entry: cached, cached: true });

        const result = await callGemini(query, DICTIONARY_SYSTEM_INSTRUCTION, dictionarySchema);

        await saveToCache(queryHash, query, result);
        res.json({ entry: result, cached: false });

    } catch (err) {
        console.error('Gemini search error:', err);
        res.status(500).json({ error: 'שגיאה בחיפוש AI', details: err.message });
    }
});

// POST /api/gemini/search-audio
router.post('/search-audio', async (req, res) => {
    try {
        const { audioData, mimeType } = req.body;
        if (!audioData) return res.status(400).json({ error: 'נדרש קובץ שמע' });

        const parts = [
            { inline_data: { mime_type: mimeType || 'audio/webm', data: audioData } }, // Note: fetch API uses snake_case keys sometimes, but Gemini API usually expects camelCase in JSON body. Let's stick to standard structure.
            { text: "Transcribe and translate to JSON. Strict dictionary format." }
        ];

        // Wait, standard JSON body for REST API:
        // { contents: [ { parts: [ { inlineData: ... }, { text: ... } ] } ] }
        const properParts = [
            { inlineData: { mimeType: mimeType || 'audio/webm', data: audioData } },
            { text: "Transcribe and translate to JSON. Strict dictionary format." }
        ];

        const result = await callGemini([{ parts: properParts }], DICTIONARY_SYSTEM_INSTRUCTION, dictionarySchema);
        res.json({ entry: result });

    } catch (err) {
        console.error('Gemini audio error:', err);
        res.status(500).json({ error: 'שגיאה בזיהוי שמע', details: err.message });
    }
});

// POST /api/gemini/tutor
router.post('/tutor', async (req, res) => {
    try {
        const { history, config, message } = req.body;

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

        // Convert history to Gemini format
        // History: [{ role: 'user', content: '...' }]
        // API: [{ role: 'user', parts: [{ text: '...' }] }]
        const contents = (history || []).map(h => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content }]
        }));

        // Add new message
        contents.push({ role: 'user', parts: [{ text: message }] });

        const result = await callGemini(contents, TUTOR_INSTRUCTION, tutorSchema);
        res.json(result);

    } catch (err) {
        console.error('Tutor error:', err);
        res.status(500).json({ error: 'שגיאה במורה פרטי', details: err.message });
    }
});

// POST /api/gemini/generate-lesson
router.post('/generate-lesson', async (req, res) => {
    try {
        const { topic, dialect, level, count } = req.body;

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
        res.json({ exercises: result });

    } catch (err) {
        console.error('Lesson gen error:', err);
        res.status(500).json({ error: 'שגיאה ביצירת שיעור', details: err.message });
    }
});

module.exports = router;
