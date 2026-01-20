
import { DictionaryEntry, ChatMessage, TutorConfig, Exercise } from "../types";
import { geminiApi, dictionaryApi } from "./apiService";

// --- Functions ---

export const searchDictionary = async (query: string): Promise<DictionaryEntry> => {
  // First check if we have a local/approved entry
  try {
    const localResult = await dictionaryApi.search(query);
    if (localResult.found && localResult.entry) {
      // Mark as community-sourced
      return { ...localResult.entry, source: 'Manual' };
    }
  } catch (err) {
    console.log('Local search failed, trying AI:', err);
  }

  // Fall back to AI search
  const response = await geminiApi.search(query);
  // Mark as AI-generated
  return { ...response.entry, source: 'AI' };
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
