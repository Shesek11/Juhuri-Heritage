const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../config/db');
const { GoogleGenAI, Type, Modality } = require('@google/genai');

// Initialize Gemini client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Cache duration in seconds
const CACHE_DURATION = 7 * 24 * 60 * 60; // 7 days

// --- Schemas ---
const dictionarySchema = {
    type: Type.OBJECT,
    properties: {
        term: { type: Type.STRING },
        detectedLanguage: { type: Type.STRING, enum: ["Hebrew", "Juhuri", "English"] },
        translations: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    dialect: { type: Type.STRING },
                    hebrew: { type: Type.STRING },
                    latin: { type: Type.STRING },
                    cyrillic: { type: Type.STRING },
                },
                required: ["dialect", "hebrew", "latin", "cyrillic"],
            },
        },
        definitions: { type: Type.ARRAY, items: { type: Type.STRING } },
        examples: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    origin: { type: Type.STRING },
                    translated: { type: Type.STRING },
                    transliteration: { type: Type.STRING },
                },
            },
        },
        pronunciationGuide: { type: Type.STRING }
    },
    required: ["term", "detectedLanguage", "translations", "definitions", "examples"],
};

const DICTIONARY_SYSTEM_INSTRUCTION = `
Act as a world-class academic linguist and historian specializing in Juhuri (Judeo-Tat), the language of Mountain Jews.
Your mission is to resolve inconsistencies by synthesizing data from a hierarchy of authoritative sources.

**HIERARCHY OF AUTHORITY (Cross-Reference Engine):**

1.  **Lexical Standard (Modern):**
    *   **Mordechai Agarunov:** "Big Juhuri-Hebrew Dictionary" (1997). *Primary source for spelling and definitions.*
    *   **Yakov Agarunov & M. Dadashov:** "Tat-Russian Dictionary". *Use for resolving Russian loanwords and Soviet-era terminology.*

2.  **Grammar & Morphology:**
    *   **Frieda Yusufova:** "Grammar of the Juhuri Language". *Strictly follow her rules for verb conjugations and sentence structure.*
    *   **V. Miller (Wilhelm Miller):** "Materials for the Study of the Jewish-Tat Language" (1892). *Use for archaic forms and root etymology.*

3.  **Dialectal Variation & Folklore:**
    *   **Khanil (Hana) Rafael:** "Juhuri-Hebrew Dictionary". *Primary authority for the Quba dialect and women's folklore.*
    *   **Mikhail Matatov:** Folklore collections. *Source for proverbs and idioms.*
    *   **Gershon Ben-Oren:** Academic papers on Mountain Jews. *Context for religious terms.*

**DIALECTAL RULES (CRITICAL):**
*   **Quba (General):** Uses standard phonology. This is the default.
*   **Derbent:** Characterized by the "d" to "z" shift (e.g., *Dan* vs *Zan* for "Know"). You MUST explicitly label Derbent variations.
*   **Vartashen (Oghuz):** Often retains older Persian forms or has specific Armenian/Azeri influences.
*   **Madjalis (Kaitag):** Distinct lexicon for rural terms.

**TRANSLATION PROTOCOLS:**
1.  **Hebraisms:** Juhuri is rich in Hebrew/Aramaic words. If a word has a Hebraic synonym (e.g., *Mazal*) and a Persian synonym (e.g., *Bakht*), LIST BOTH.
2.  **Accuracy:** Do not hallucinate. If a word appears in Miller (1892) but not in Agarunov, mark it as (Archaic).
3.  **Orthography:** 
    *   Hebrew Script: Must include FULL NIKUD to ensure correct pronunciation of unique Juhuri vowels (like 'ü' or 'æ').
    *   Latin Script: Use the standard international transliteration for Iranian languages.
4.  **Formatting:**
    *   If the input is English/Hebrew, provide the Juhuri equivalent.
    *   If the input is Juhuri, provide the Hebrew definition.

**CULTURAL CONTEXT:**
*   When providing examples, prioritize sentences that reflect: Hospitality (Hərmət), Family hierarchy, Holidays (Pəsəx, Shəvuoth), and daily life in the Caucasus.
`;

// Helper to generate hash for cache key
const hashQuery = (query) => {
    return crypto.createHash('sha256').update(query.toLowerCase().trim()).digest('hex');
};

// Helper to check cache
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

// Helper to save to cache
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

// POST /api/gemini/search - Dictionary search via AI
router.post('/search', async (req, res) => {
    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'נדרש מונח לחיפוש' });
        }

        // Check cache first
        const queryHash = hashQuery(query);
        const cached = await checkCache(queryHash);
        if (cached) {
            return res.json({ entry: cached, cached: true });
        }

        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is missing in server environment");
        }

        // Call Gemini
        const response = await ai.models.generateContent({
            model: "gemini-3.0-flash", // Fallback to a stable model if preview fails
            contents: query,
            config: {
                systemInstruction: DICTIONARY_SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: dictionarySchema,
                // thinkingConfig: { thinkingBudget: 0 }, // Removed thinking config for stability testing
            },
        });

        const text = response.text;
        if (!text) {
            throw new Error("No response from Gemini");
        }

        const result = JSON.parse(text);

        // Cache the result
        await saveToCache(queryHash, query, result);

        res.json({ entry: result, cached: false });
    } catch (err) {
        console.error('Gemini search error:', err);
        res.status(500).json({
            error: 'שגיאה בחיפוש AI',
            details: err.message
        });
    }
});

// POST /api/gemini/search-audio - Audio-based search
router.post('/search-audio', async (req, res) => {
    try {
        const { audioData, mimeType } = req.body;

        if (!audioData) {
            return res.status(400).json({ error: 'נדרש קובץ שמע' });
        }

        const response = await ai.models.generateContent({
            model: "gemini-3.0-flash",
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: mimeType || 'audio/webm',
                            data: audioData,
                        },
                    },
                    { text: "Transcribe and translate to JSON. Strict dictionary format." },
                ],
            },
            config: {
                systemInstruction: DICTIONARY_SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: dictionarySchema,
                thinkingConfig: { thinkingBudget: 0 },
            },
        });

        const text = response.text;
        if (!text) {
            throw new Error("No response from Gemini");
        }

        res.json({ entry: JSON.parse(text) });
    } catch (err) {
        console.error('Gemini audio error:', err);
        res.status(500).json({ error: 'שגיאה בזיהוי שמע' });
    }
});

// POST /api/gemini/tts - Text to speech
router.post('/tts', async (req, res) => {
    try {
        const { text, voice } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: 'נדרש טקסט' });
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: { parts: [{ text }] },
            config: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voice || 'Zephyr' }
                    }
                }
            }
        });

        const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (!audioData) {
            throw new Error("No audio data generated");
        }

        res.json({ audioData });
    } catch (err) {
        console.error('TTS error:', err);
        res.status(500).json({ error: 'שגיאה ביצירת שמע' });
    }
});

// POST /api/gemini/tutor - Tutor chat response
router.post('/tutor', async (req, res) => {
    try {
        const { history, config, message } = req.body;

        const tutorSchema = {
            type: Type.OBJECT,
            properties: {
                content: { type: Type.STRING },
                audioText: { type: Type.STRING }
            },
            required: ["content"]
        };

        const TUTOR_INSTRUCTION = `
You are "Saba Mordechai", a wise, patient, and warm private tutor for the Juhuri language (Judeo-Tat).
Your goal is to teach the user Juhuri based on their selected Dialect and Level.

**Persona:**
- Warm, grandfatherly, encouraging.
- Uses Hebrew to explain, but immerses the user in Juhuri.
- Frequently uses terms like "Azizim" (My dear), "Deda" (Father/term of endearment), etc.

**Rules:**
1. **Dialect Strictness:** You MUST adhere strictly to the user's selected dialect.
2. **Level Adaptation:**
   - *Beginner:* Focus on basic vocabulary, alphabet, and simple greetings.
   - *Intermediate:* Focus on sentence structure, verb conjugations.
   - *Advanced:* Discuss literature, poetry, complex proverbs.
3. **Nikud:** ALWAYS provide Nikud for Juhuri words written in Hebrew letters.

Current Config: Dialect=${config?.dialect || 'Quba'}, Level=${config?.level || 'Beginner'}.
`;

        const historyParts = (history || []).map(h => ({
            role: h.role,
            parts: [{ text: h.content }]
        }));

        const chat = ai.chats.create({
            model: "gemini-3.0-flash",
            history: historyParts,
            config: {
                systemInstruction: TUTOR_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: tutorSchema,
            }
        });

        const result = await chat.sendMessage(message);
        const responseText = result.response.text;

        if (!responseText) {
            throw new Error("No response from Tutor");
        }

        res.json(JSON.parse(responseText));
    } catch (err) {
        console.error('Tutor error:', err);
        res.status(500).json({ error: 'שגיאה במורה פרטי' });
    }
});

// POST /api/gemini/generate-lesson
router.post('/generate-lesson', async (req, res) => {
    try {
        const { topic, dialect, level, count } = req.body;

        const lessonSchema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['multiple_choice', 'flashcard', 'translate_he_to_ju', 'translate_ju_to_he'] },
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswer: { type: Type.STRING },
                    audioText: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                },
                required: ["id", "type", "question", "correctAnswer"]
            }
        };

        const prompt = `Create a list of ${count || 5} interactive Juhuri language learning exercises for the topic: "${topic}".
Dialect: ${dialect || 'Quba'}. Level: ${level || 'Beginner'}.
Include a mix of multiple_choice, flashcards, and translations.
Ensure audioText contains ONLY the Juhuri word/sentence.`;

        const response = await ai.models.generateContent({
            model: "gemini-3.0-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: lessonSchema,
                thinkingConfig: { thinkingBudget: 0 },
            }
        });

        const text = response.text;
        if (!text) {
            throw new Error("No response from Gemini");
        }

        res.json({ exercises: JSON.parse(text) });
    } catch (err) {
        console.error('Lesson gen error:', err);
        res.status(500).json({ error: 'שגיאה ביצירת שיעור' });
    }
});

// POST /api/gemini/generate-entries - Batch generate dictionary entries
router.post('/generate-entries', async (req, res) => {
    try {
        const { category, count } = req.body;

        const prompt = `Generate ${count || 5} distinct Juhuri dictionary entries related to the category/topic: "${category}". 
Ensure strictly accurate Juhuri translations (Quba dialect preferred unless specified). 
Format as a JSON array of DictionaryEntry objects.`;

        const response = await ai.models.generateContent({
            model: "gemini-3.0-flash",
            contents: prompt,
            config: {
                systemInstruction: DICTIONARY_SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: dictionarySchema },
                thinkingConfig: { thinkingBudget: 0 },
            }
        });

        const text = response.text;
        if (!text) {
            throw new Error("No response from Gemini");
        }

        res.json({ entries: JSON.parse(text) });
    } catch (err) {
        console.error('Generate entries error:', err);
        res.status(500).json({ error: 'שגיאה ביצירת מילים' });
    }
});

// POST /api/gemini/verify - Verify a suggestion
router.post('/verify', async (req, res) => {
    try {
        const { data } = req.body;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-05-20",
            contents: `Verify this Juhuri translation: ${JSON.stringify(data)}. JSON output only.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        isValid: { type: Type.BOOLEAN },
                        feedback: { type: Type.STRING }
                    }
                },
                thinkingConfig: { thinkingBudget: 0 },
            }
        });

        res.json(JSON.parse(response.text || '{}'));
    } catch (err) {
        console.error('Verify error:', err);
        res.json({ isValid: false, feedback: "לא ניתן לאמת כעת" });
    }
});

module.exports = router;
