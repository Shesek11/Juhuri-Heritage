
import { DictionaryEntry, ChatMessage, TutorConfig, Exercise } from "../types";
import { geminiApi, dictionaryApi } from "./apiService";

// --- Functions ---

export interface SearchResult {
  entry: DictionaryEntry;
  additionalResults: DictionaryEntry[];
  enrichmentPromise?: Promise<Record<string, any> | null>;
}

export const searchDictionary = async (query: string): Promise<SearchResult> => {
  // First check if we have a local/approved entry
  try {
    const localResult = await dictionaryApi.search(query);
    if (localResult.found && localResult.entry) {
      const entry: DictionaryEntry = { ...localResult.entry, source: localResult.entry.source || 'מאגר' };

      // Check for missing fields that AI can fill
      const missingFields: string[] = [];
      const t = entry.translations?.[0];
      if (!t?.latin) missingFields.push('latin');
      if (!t?.cyrillic) missingFields.push('cyrillic');
      if (!entry.examples || entry.examples.length === 0) missingFields.push('examples');
      if (!entry.pronunciationGuide) missingFields.push('pronunciationGuide');

      // If there are missing fields, start enrichment (returns promise for UI to observe)
      let enrichmentPromise: Promise<Record<string, any> | null> | undefined;
      if (missingFields.length > 0) {
        enrichmentPromise = geminiApi.enrich(entry.term, t?.hebrew || '', missingFields)
          .then((res: any) => res.enrichment || null)
          .catch(() => null);
      }

      // Additional results from the same search (server returns up to 5)
      const additionalResults: DictionaryEntry[] = (localResult.results || [])
        .slice(1)
        .map((r: any) => ({ ...r, source: r.source || 'מאגר' }));

      return { entry, additionalResults, enrichmentPromise };
    }
  } catch (err) {
    console.log('Local search failed, trying AI:', err);
  }

  // No local result found — don't fall back to AI (it invents non-existent words)
  throw new Error('NOT_FOUND');
};

export const searchByAudio = async (base64Audio: string, mimeType: string): Promise<DictionaryEntry> => {
  const response = await geminiApi.searchAudio(base64Audio, mimeType);
  return response.entry;
};

export const verifySuggestion = async (data: any): Promise<{ isValid: boolean; feedback: string }> => {
  try {
    return await geminiApi.verify(data);
  } catch (e) {
    return { isValid: false, feedback: "לא ניתן לאמת כעת" };
  }
};

export const generateSpeech = async (text: string, voiceName: 'Kore' | 'Puck' | 'Fenrir' | 'Zephyr' = 'Zephyr'): Promise<string> => {
  if (!text || text.trim().length === 0) {
    throw new Error("Text is empty");
  }

  const response = await geminiApi.tts(text, voiceName);

  if (!response.audioData) {
    throw new Error("No audio data generated");
  }

  return response.audioData;
};

export const getTutorResponse = async (history: ChatMessage[], config: TutorConfig, lastUserMessage: string): Promise<{ content: string; audioText?: string }> => {
  return await geminiApi.tutor(history, config, lastUserMessage);
};

export const generateBatchEntries = async (category: string, count: number = 5): Promise<DictionaryEntry[]> => {
  const response = await geminiApi.generateEntries(category, count);
  return response.entries;
};

export const generateLessonExercises = async (topic: string, dialect: string, level: string, count: number = 5): Promise<Exercise[]> => {
  const response = await geminiApi.generateLesson(topic, dialect, level, count);
  return response.exercises;
};
