const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../config/db');

// --- Configuration ---
const API_KEY = process.env.GEMINI_API_KEY;
const CACHE_DURATION = 7 * 24 * 60 * 60; // 7 days

// Models to try in order of preference
const MODELS = [
    "gemini-3.0-flash",           // Primary
    "gemini-2.5-flash",           // First fallback
    "gemini-2.0-flash-exp",       // Experimental fallback
    "gemini-1.5-flash"            // Stable fallback
];

// --- Schemas & Instructions ---
// (Kept identical to preserve logic)
const DICTIONARY_SYSTEM_INSTRUCTION = `
אתה בלשן ומומחה אקדמי ברמה עולמית, המתמחה בג'והורית (יהודית-טטית), שפת יהודי ההרים.
המשימה שלך היא לפתור אי-עקביות על ידי סינתזה של נתונים מהיררכיה של מקורות סמכותיים.

**כל הפלט חייב להיות בעברית בלבד, אין להשתמש באנגלית כלל.**

**היררכית סמכות (מנוע הצלבה):**
1.  **תקן לקסיקלי (מודרני):** מרדכי אגרונוב ("מילון ג'והורי-עברי הגדול").
2.  **דקדוק ומורפולוגיה:** פרידה יוסופובה ("דקדוק השפה הג'והורית").
3.  **שונות דיאלקטלית:** חניל רפאל ("מילון ג'והורי-עברי").

**כללי דיאלקט (קריטי):**
*   **קובה (כללי):** פונולוגיה סטנדרטית.
*   **דרבנט:** מאופיין בהחלפת "ד" ל-"ז".
*   **וורטשן (אוגוז):** צורות פרסיות עתיקות יותר.

**פרוטוקולי תרגום:**
1.  **עבריזמים:** רשום גם עבריזמים וגם מילים נרדפות פרסיות אם קיימות.
2.  **דיוק:** אל תמציא מידע.
3.  **אורתוגרפיה:** ניקוד בעברית ולטינית סטנדרטית.
4.  **עיצוב:** עברית -> ג'והורית; ג'והורית -> עברית.

**הקשר תרבותי:**
תעדף דוגמאות המשקפות הכנסת אורחים (הרמת), משפחה, חגים.

**חשוב מאוד: כל ההגדרות, ההסברים, והתרגומים בדוגמאות חייבים להיות בעברית בלבד. אין להשתמש באנגלית.**
`;

const dictionarySchema = {
    type: "OBJECT",
    properties: {
        term: { type: "STRING" },
        detectedLanguage: { type: "STRING", enum: ["Hebrew", "Juhuri", "English"] },
        translations: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    dialect: { type: "STRING" },
                    hebrew: { type: "STRING" },
                    latin: { type: "STRING" },
                    cyrillic: { type: "STRING" },
                },
                required: ["dialect", "hebrew", "latin", "cyrillic"],
            },
        },
        definitions: { type: "ARRAY", items: { type: "STRING" } },
        examples: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    origin: { type: "STRING" },
                    translated: { type: "STRING" },
                    transliteration: { type: "STRING" },
                },
            },
        },
        pronunciationGuide: { type: "STRING" }
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
 */
async function callGemini(contentsParts, systemInstruction, responseSchema) {
    if (!API_KEY) throw new Error("GEMINI_API_KEY is missing");

    let lastError = null;

    for (const model of MODELS) {
        try {
            // console.log(`Attempting Gemini model: ${model}`); // Debug logging if needed
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

            const body = {
                contents: Array.isArray(contentsParts) ? contentsParts : [{ parts: [{ text: contentsParts }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema
                }
            };

            if (systemInstruction) {
                body.systemInstruction = { parts: [{ text: systemInstruction }] };
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                // If it's a 404 (Model not found), try next model.
                // If it's 429 (Quota), might also want to try next model or fail.
                throw new Error(errorData?.error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) throw new Error("Empty response from Gemini");

            return JSON.parse(text); // Success!

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
