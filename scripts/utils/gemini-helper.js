#!/usr/bin/env node

/**
 * 🤖 Gemini AI Helper for Dictionary Import
 *
 * תכונות:
 * - OCR לתמונות ו-PDFs סרוקים
 * - זיהוי שפה אוטומטי
 * - תרגום רוסית→עברית
 * - Transliteration
 * - File Upload API לקבצי PDF גדולים
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require('@google/generative-ai/server');
const fs = require('fs');
require('dotenv').config();

class GeminiHelper {
    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('❌ GEMINI_API_KEY not found in .env file');
        }

        const apiKey = process.env.GEMINI_API_KEY;
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.fileManager = new GoogleAIFileManager(apiKey);

        // Allow custom model via .env, otherwise use default
        const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
        console.log(`🤖 Using Gemini model: ${modelName}`);

        this.model = this.genAI.getGenerativeModel({ model: modelName });
    }

    /**
     * OCR - קריאת טקסט מתמונה או PDF
     * תומך: JPG, PNG, GIF, WEBP, PDF
     * PDF גדול: משתמש ב-File Upload API
     * תמונות קטנות: Inline Base64
     */
    async extractTextFromImage(imagePath) {
        try {
            const mimeType = this._getMimeType(imagePath);
            console.log(`   MIME type: ${mimeType}`);

            let contentPart;

            // PDF: Use File Upload API (handles large files better)
            if (mimeType === 'application/pdf') {
                console.log(`   📤 Uploading PDF to Gemini File Manager...`);

                const uploadResult = await this.fileManager.uploadFile(imagePath, {
                    mimeType: mimeType,
                    displayName: "Dictionary PDF"
                });

                const fileUri = uploadResult.file.uri;
                console.log(`   ✓ File uploaded: ${uploadResult.file.name}`);

                // Wait for file to be processed
                await this._waitForFileActive(uploadResult.file.name);

                contentPart = {
                    fileData: {
                        mimeType: uploadResult.file.mimeType,
                        fileUri: fileUri
                    }
                };
            }
            // Images: Use inline Base64 (faster for small files)
            else {
                console.log(`   Reading image file...`);
                const imageData = fs.readFileSync(imagePath, { encoding: 'base64' });

                contentPart = {
                    inlineData: {
                        mimeType: mimeType,
                        data: imageData
                    }
                };
            }

            const prompt = `
You are a Juhuri language expert helping digitize a dictionary.

This file contains Juhuri-Hebrew-Russian dictionary entries.
Extract ALL visible entries in this exact JSON format:

{
  "entries": [
    {
      "juhuri": "word in Juhuri script (preserve original)",
      "hebrew": "Hebrew translation (if present)",
      "russian": "Russian translation (if present)",
      "latin": "Latin transliteration (if present)",
      "notes": "any additional notes or context",
      "confidence": 0.95
    }
  ]
}

CRITICAL RULES:
- Preserve original spelling EXACTLY - no corrections
- If a field is empty/unclear, use empty string ""
- Set confidence 0.0-1.0 based on image quality
- Maintain Hebrew RTL directionality
- Preserve Cyrillic for Russian
- Extract ALL entries visible, even partial ones
- If unsure about a character, mark with "?"

Return ONLY valid JSON, nothing else. No markdown formatting.
`;

            console.log(`   🧠 Analyzing with Gemini...`);
            const result = await this.model.generateContent([prompt, contentPart]);
            const response = await result.response;
            const text = response.text();

            // Clean up response (remove markdown code blocks if present)
            const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            return JSON.parse(jsonText);

        } catch (error) {
            console.error(`❌ OCR failed for ${imagePath}:`);
            console.error(`   Error type: ${error.constructor.name}`);
            console.error(`   Error message: ${error.message}`);
            if (error.stack) {
                console.error(`   Stack trace (first 200 chars): ${error.stack.substring(0, 200)}`);
            }
            return { entries: [], error: error.message };
        }
    }

    /**
     * המתנה לסיום עיבוד קובץ ב-Gemini
     */
    async _waitForFileActive(fileName) {
        let file = await this.fileManager.getFile(fileName);
        let attempts = 0;
        const maxAttempts = 30; // 1 minute max

        while (file.state === "PROCESSING" && attempts < maxAttempts) {
            console.log(`   ⏳ File processing... (attempt ${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            file = await this.fileManager.getFile(fileName);
            attempts++;
        }

        if (file.state !== "ACTIVE") {
            throw new Error(`File ${fileName} failed to process. State: ${file.state}`);
        }

        console.log(`   ✓ File ready for analysis`);
    }

    /**
     * זיהוי שפה אוטומטי
     */
    async detectLanguage(text) {
        try {
            const prompt = `
Detect the language of this text. Is it:
- Juhuri (Judeo-Tat, written in Hebrew or Latin script)
- Hebrew
- Russian (Cyrillic)
- English
- Mixed (multiple languages)

Text: "${text}"

Return ONLY one word: Juhuri, Hebrew, Russian, English, or Mixed
`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const detected = response.text().trim();

            return detected;
        } catch (error) {
            console.error('❌ Language detection failed:', error.message);
            return 'Unknown';
        }
    }

    /**
     * תרגום רוסית → עברית
     */
    async translateRussianToHebrew(russianText) {
        try {
            const prompt = `
Translate this Russian text to Hebrew.
Context: This is a dictionary entry for the Juhuri language.

Russian: "${russianText}"

Return ONLY the Hebrew translation, nothing else.
Make sure the Hebrew is grammatically correct and natural.
`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const translation = response.text().trim();

            return {
                hebrew: translation,
                confidence: 0.75, // Lower confidence for AI translation
                source: 'AI'
            };
        } catch (error) {
            console.error('❌ Translation failed:', error.message);
            return { hebrew: '', confidence: 0, source: 'Error' };
        }
    }

    /**
     * Transliteration - ג'והורי → Latin
     */
    async transliterateToLatin(juhuriText) {
        try {
            const prompt = `
Transliterate this Juhuri (Judeo-Tat) text to Latin script.
Follow standard Juhuri Latin romanization rules.

Juhuri: "${juhuriText}"

Return ONLY the Latin transliteration, nothing else.
`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const latin = response.text().trim();

            return {
                latin: latin,
                confidence: 0.85
            };
        } catch (error) {
            console.error('❌ Transliteration failed:', error.message);
            return { latin: '', confidence: 0 };
        }
    }

    /**
     * המרה לקירילית (רוסית)
     */
    async convertToCyrillic(russianText) {
        // If already in Cyrillic, return as-is
        if (/[А-Яа-я]/.test(russianText)) {
            return russianText;
        }

        try {
            const prompt = `
Convert this Russian text to Cyrillic script.

Russian (possibly in Latin): "${russianText}"

Return ONLY the Cyrillic version, nothing else.
`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim();
        } catch (error) {
            console.error('❌ Cyrillic conversion failed:', error.message);
            return russianText; // Return original if fails
        }
    }

    /**
     * ניתוח טקסט חופשי לזיהוי entries
     */
    async parseUnstructuredText(text, sourceType = 'pdf') {
        try {
            const prompt = `
You are analyzing a ${sourceType === 'pdf' ? 'PDF' : 'text'} from a Juhuri dictionary.
The text may contain dictionary entries in an unstructured format.

Extract dictionary entries and structure them as JSON:

Text:
"""
${text}
"""

Return in this exact JSON format:
{
  "entries": [
    {
      "juhuri": "word in Juhuri",
      "hebrew": "Hebrew translation",
      "russian": "Russian translation",
      "latin": "Latin transliteration",
      "definition": "definition if present",
      "notes": "any additional context",
      "confidence": 0.9
    }
  ]
}

RULES:
- Look for patterns: "word = translation", "word - translation", etc.
- Identify which language is which based on script
- Hebrew uses Hebrew script (א-ת)
- Russian uses Cyrillic (А-Я)
- Juhuri may use Hebrew or Latin script
- If uncertain, set lower confidence
- Extract ALL entries found

Return ONLY valid JSON.
`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const responseText = response.text();

            // Clean up response
            const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            return JSON.parse(jsonText);
        } catch (error) {
            console.error('❌ Text parsing failed:', error.message);
            return { entries: [], error: error.message };
        }
    }

    /**
     * Helper: זיהוי MIME type
     */
    _getMimeType(filePath) {
        const ext = filePath.toLowerCase().split('.').pop();
        const mimeTypes = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'pdf': 'application/pdf'
        };
        return mimeTypes[ext] || 'image/jpeg';
    }
}

// Export singleton
module.exports = new GeminiHelper();
