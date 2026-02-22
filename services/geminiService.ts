
import { DictionaryEntry, ChatMessage, TutorConfig, Exercise } from "../types";
import { geminiApi, dictionaryApi } from "./apiService";

// --- Functions ---

export const searchDictionary = async (query: string): Promise<DictionaryEntry> => {
  // First check if we have a local/approved entry
  try {
    const localResult = await dictionaryApi.search(query);
    if (localResult.found && localResult.entry) {
      const entry: DictionaryEntry = { ...localResult.entry, source: localResult.entry.source || 'Manual' };

      // Check for missing fields that AI can fill
      const missingFields: string[] = [];
      const t = entry.translations?.[0];
      if (!t?.latin) missingFields.push('latin');
      if (!t?.cyrillic) missingFields.push('cyrillic');
      if (!entry.examples || entry.examples.length === 0) missingFields.push('examples');
      if (!entry.pronunciationGuide) missingFields.push('pronunciationGuide');

      // If there are missing fields, try to enrich with AI (non-blocking)
      if (missingFields.length > 0) {
        try {
          const enrichResult = await geminiApi.enrich(entry.term, t?.hebrew || '', missingFields);
          const enrichment = enrichResult.enrichment;
          const fieldSources = { ...entry.fieldSources } || {};

          // Merge AI data into entry
          if (enrichment.latin && !t?.latin && entry.translations?.length) {
            entry.translations[0].latin = enrichment.latin;
            fieldSources.latin = 'ai';
          }
          if (enrichment.cyrillic && !t?.cyrillic && entry.translations?.length) {
            entry.translations[0].cyrillic = enrichment.cyrillic;
            fieldSources.cyrillic = 'ai';
          }
          if (enrichment.examples?.length && (!entry.examples || entry.examples.length === 0)) {
            entry.examples = enrichment.examples;
            fieldSources.examples = 'ai';
          }
          if (enrichment.pronunciationGuide && !entry.pronunciationGuide) {
            entry.pronunciationGuide = enrichment.pronunciationGuide;
            fieldSources.pronunciationGuide = 'ai';
          }

          entry.fieldSources = fieldSources;
        } catch (enrichErr) {
          console.log('AI enrichment failed (non-critical):', enrichErr);
        }
      }

      return entry;
    }
  } catch (err) {
    console.log('Local search failed, trying AI:', err);
  }

  // Fall back to full AI search
  const response = await geminiApi.search(query);
  const aiFieldSources: Record<string, string> = {};
  const aiEntry = response.entry;
  if (aiEntry.term) aiFieldSources.term = 'ai';
  if (aiEntry.translations?.length) {
    aiFieldSources.hebrew = 'ai';
    aiFieldSources.latin = 'ai';
    aiFieldSources.cyrillic = 'ai';
  }
  if (aiEntry.definitions?.length) aiFieldSources.definition = 'ai';
  if (aiEntry.pronunciationGuide) aiFieldSources.pronunciationGuide = 'ai';
  if (aiEntry.examples?.length) aiFieldSources.examples = 'ai';

  return { ...aiEntry, source: 'AI', fieldSources: aiFieldSources };
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
