
import { Exercise, ExerciseType, TutorWord } from '../types';

/**
 * Generate exercises from dictionary words using templates.
 * No AI needed - instant, consistent, and free.
 */

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function pickRandom<T>(arr: T[], count: number): T[] {
  return shuffleArray(arr).slice(0, count);
}

function getDistractors(targetWord: TutorWord, allWords: TutorWord[], count: number = 3): string[] {
  const others = allWords.filter(w => w.id !== targetWord.id);
  return pickRandom(others, count).map(w => w.hebrewShort);
}

function getDistractorTerms(targetWord: TutorWord, allWords: TutorWord[], count: number = 3): string[] {
  const others = allWords.filter(w => w.id !== targetWord.id);
  return pickRandom(others, count).map(w => w.hebrewScript);
}

let exerciseCounter = 0;

function makeId(): string {
  return `ex_${Date.now()}_${++exerciseCounter}`;
}

// --- Exercise Generators ---

function generateMultipleChoice(word: TutorWord, allWords: TutorWord[]): Exercise {
  const distractors = getDistractors(word, allWords);
  const options = shuffleArray([word.hebrewShort, ...distractors]);
  return {
    id: makeId(),
    type: 'multiple_choice',
    question: word.hebrewScript,
    options,
    correctAnswer: word.hebrewShort,
    audioText: word.hebrewScript,
    explanation: word.pronunciationGuide ? `הגייה: ${word.pronunciationGuide}` : undefined,
  };
}

function generateMatchingPairs(words: TutorWord[]): Exercise {
  const selected = pickRandom(words, Math.min(5, words.length));
  return {
    id: makeId(),
    type: 'matching_pairs',
    question: 'חבר כל מילה לתרגום שלה',
    correctAnswer: '',
    pairs: selected.map(w => ({ term: w.hebrewScript, translation: w.hebrewShort })),
  };
}

function generateAudioRecognition(word: TutorWord, allWords: TutorWord[]): Exercise {
  const distractorTerms = getDistractorTerms(word, allWords);
  const options = shuffleArray([word.hebrewScript, ...distractorTerms]);
  return {
    id: makeId(),
    type: 'audio_recognition',
    question: 'הקשב ובחר את המילה שנאמרה',
    options,
    correctAnswer: word.hebrewScript,
    audioText: word.hebrewScript,
  };
}

function generateContextAssociation(word: TutorWord, allWords: TutorWord[]): Exercise {
  const distractors = getDistractors(word, allWords);
  const options = shuffleArray([word.hebrewShort, ...distractors]);
  const hint = word.example || word.pronunciationGuide || '';
  return {
    id: makeId(),
    type: 'context_association',
    question: `${word.hebrewScript}${hint ? `\n💡 ${hint}` : ''}`,
    options,
    correctAnswer: word.hebrewShort,
    audioText: word.hebrewScript,
    explanation: word.example ? `דוגמה: ${word.example}` : undefined,
  };
}

function generateWordBankHeToJu(word: TutorWord, allWords: TutorWord[]): Exercise {
  const letters = word.hebrewScript.split('');
  const extraLetters = pickRandom(
    allWords.filter(w => w.id !== word.id).flatMap(w => w.hebrewScript.split('')),
    Math.min(3, Math.ceil(letters.length * 0.5))
  );
  const tiles = shuffleArray([...letters, ...extraLetters]);
  return {
    id: makeId(),
    type: 'word_bank_he_to_ju',
    question: word.hebrewShort,
    correctAnswer: word.hebrewScript,
    tiles,
    audioText: word.hebrewScript,
    explanation: word.pronunciationGuide ? `הגייה: ${word.pronunciationGuide}` : undefined,
  };
}

function generateWordBankJuToHe(word: TutorWord, allWords: TutorWord[]): Exercise {
  const letters = word.hebrewShort.split('');
  const extraLetters = pickRandom(
    allWords.filter(w => w.id !== word.id).flatMap(w => w.hebrewShort.split('')),
    Math.min(3, Math.ceil(letters.length * 0.5))
  );
  const tiles = shuffleArray([...letters, ...extraLetters]);
  return {
    id: makeId(),
    type: 'word_bank_ju_to_he',
    question: word.hebrewScript,
    correctAnswer: word.hebrewShort,
    tiles,
    audioText: word.hebrewScript,
  };
}

function generateFillBlank(word: TutorWord, allWords: TutorWord[]): Exercise {
  const sentence = word.example || `_____ (${word.hebrewShort})`;
  const distractorTerms = getDistractorTerms(word, allWords, 3);
  const options = shuffleArray([word.hebrewScript, ...distractorTerms]);
  return {
    id: makeId(),
    type: 'fill_blank',
    question: 'השלם את החסר',
    sentence: sentence.replace(word.hebrewScript, '_____') || `_____ = ${word.hebrewShort}`,
    options,
    correctAnswer: word.hebrewScript,
    audioText: word.hebrewScript,
    blank: word.hebrewScript,
  };
}

function generateSpellingChallenge(word: TutorWord): Exercise {
  const letters = shuffleArray(word.hebrewScript.split(''));
  return {
    id: makeId(),
    type: 'spelling_challenge',
    question: `איית: ${word.hebrewShort}`,
    correctAnswer: word.hebrewScript,
    tiles: letters,
    audioText: word.hebrewScript,
  };
}

function generateListenSelect(word: TutorWord, allWords: TutorWord[]): Exercise {
  const distractors = getDistractors(word, allWords);
  const options = shuffleArray([word.hebrewShort, ...distractors]);
  return {
    id: makeId(),
    type: 'listen_select',
    question: 'הקשב ובחר את התרגום הנכון',
    options,
    correctAnswer: word.hebrewShort,
    audioText: word.hebrewScript,
  };
}

function generateDictation(word: TutorWord): Exercise {
  return {
    id: makeId(),
    type: 'dictation',
    question: 'הקשב וכתוב את המילה',
    correctAnswer: word.hebrewScript,
    audioText: word.hebrewScript,
    explanation: `${word.hebrewScript} = ${word.hebrewShort}`,
  };
}

function generateSpeedMatch(words: TutorWord[]): Exercise {
  const selected = pickRandom(words, Math.min(6, words.length));
  return {
    id: makeId(),
    type: 'speed_match',
    question: 'חבר במהירות!',
    correctAnswer: '',
    pairs: selected.map(w => ({ term: w.hebrewScript, translation: w.hebrewShort })),
  };
}

function generateTrueFalseFlash(word: TutorWord, allWords: TutorWord[]): Exercise {
  const isCorrect = Math.random() > 0.4; // 60% correct, 40% false
  let shownTranslation = word.hebrewShort;

  if (!isCorrect) {
    const others = allWords.filter(w => w.id !== word.id && w.hebrewShort !== word.hebrewShort);
    if (others.length > 0) {
      shownTranslation = others[Math.floor(Math.random() * others.length)].hebrewShort;
    }
  }

  return {
    id: makeId(),
    type: 'true_false_flash',
    question: `${word.hebrewScript} = ${shownTranslation}`,
    correctAnswer: isCorrect ? 'true' : 'false',
    isCorrect,
    audioText: word.hebrewScript,
  };
}

// --- Main Generator ---

const GENERATOR_MAP: Record<string, (word: TutorWord, allWords: TutorWord[]) => Exercise> = {
  multiple_choice: generateMultipleChoice,
  audio_recognition: generateAudioRecognition,
  context_association: generateContextAssociation,
  word_bank_he_to_ju: generateWordBankHeToJu,
  word_bank_ju_to_he: generateWordBankJuToHe,
  fill_blank: generateFillBlank,
  spelling_challenge: (w) => generateSpellingChallenge(w),
  listen_select: generateListenSelect,
  dictation: (w) => generateDictation(w),
  true_false_flash: generateTrueFalseFlash,
};

/**
 * Generate a full lesson of exercises from given words and available types.
 */
export function generateLesson(
  words: TutorWord[],
  exerciseTypes: ExerciseType[],
  exerciseCount: number = 12,
  reviewWords: TutorWord[] = []
): Exercise[] {
  if (words.length < 2) return [];

  const allWords = [...words, ...reviewWords];
  const exercises: Exercise[] = [];
  exerciseCounter = 0;

  // Phase 1: Introduce new words (2-3 flashcard-style introductions)
  const newWordIntros = pickRandom(words, Math.min(3, words.length));
  for (const word of newWordIntros) {
    exercises.push({
      id: makeId(),
      type: 'multiple_choice',
      question: word.hebrewScript,
      options: shuffleArray([word.hebrewShort, ...getDistractors(word, allWords)]),
      correctAnswer: word.hebrewShort,
      audioText: word.hebrewScript,
      explanation: `${word.hebrewScript} = ${word.hebrewShort}${word.pronunciationGuide ? ` (${word.pronunciationGuide})` : ''}`,
    });
  }

  // Phase 2: Main exercises
  const remainingCount = exerciseCount - exercises.length;
  const availableTypes = exerciseTypes.filter(t => t !== 'matching_pairs' && t !== 'speed_match');
  const pairTypes = exerciseTypes.filter(t => t === 'matching_pairs' || t === 'speed_match');

  for (let i = 0; i < remainingCount; i++) {
    // Every 4th exercise, insert a pair/group exercise if available
    if (i > 0 && i % 4 === 0 && pairTypes.length > 0 && allWords.length >= 4) {
      const pairType = pairTypes[i % pairTypes.length];
      if (pairType === 'matching_pairs') {
        exercises.push(generateMatchingPairs(allWords));
      } else {
        exercises.push(generateSpeedMatch(allWords));
      }
      continue;
    }

    if (availableTypes.length === 0) continue;

    const type = availableTypes[i % availableTypes.length];
    const word = allWords[i % allWords.length];
    const generator = GENERATOR_MAP[type];

    if (generator) {
      exercises.push(generator(word, allWords));
    }
  }

  // Add review words as extra exercises at the end
  if (reviewWords.length > 0) {
    for (const rw of reviewWords.slice(0, 3)) {
      exercises.push(generateMultipleChoice(rw, allWords));
    }
  }

  return exercises.slice(0, exerciseCount + reviewWords.length);
}
