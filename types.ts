
export interface Translation {
  id?: number; // Database ID for voting
  dialect: string; // e.g., "General", "Derbent", "Quba"
  hebrew: string; // Text in Hebrew script
  latin: string; // Text in Latin/English script
  cyrillic: string; // Text in Cyrillic script
  upvotes?: number; // Community upvote count
  downvotes?: number; // Community downvote count
  userVote?: 'up' | 'down' | null; // Current user's vote on this translation
}

export interface Example {
  origin: string;
  translated: string;
  transliteration?: string;
}

export interface FieldSources {
  [fieldName: string]: 'import' | 'ai' | 'community' | 'manual';
}

export interface DictionaryEntry {
  term: string;
  detectedLanguage: 'Hebrew' | 'Juhuri' | 'English';
  translations: Translation[];
  definitions: string[];
  examples: Example[];
  pronunciationGuide?: string;
  partOfSpeech?: string;
  russian?: string;
  isCustom?: boolean; // Flag to indicate if this came from the manual DB
  source?: 'AI' | 'Manual' | 'User' | 'Community'; // Origin of the entry
  status?: 'active' | 'pending'; // Moderation status
  contributorId?: string; // ID of the user who contributed this
  fieldSources?: FieldSources; // Per-field source tracking (import/ai/community)

  // Audit fields
  approvedBy?: string; // Name/ID of the admin who approved
  approvedAt?: number; // Timestamp of approval

  // Community fields
  id?: string; // Database ID needed for likes/comments
  likesCount?: number;
  commentsCount?: number;
  isLiked?: boolean;
}

export interface Comment {
  id: number;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

export interface HistoryItem extends DictionaryEntry {
  timestamp: number;
  id: string;
}

export type Theme = 'light' | 'dark';

export interface ContributeFormData {
  term: string;
  translation: string;
  dialect: string;
  notes: string;
}

// --- System Logs ---
export type EventType = 'ENTRY_ADDED' | 'ENTRY_APPROVED' | 'ENTRY_DELETED' | 'ENTRY_REJECTED' | 'USER_LOGIN' | 'USER_REGISTER' | 'USER_ROLE_CHANGE' | 'USER_DELETED' | 'DIALECT_ADDED';

export interface SystemEvent {
  id: string;
  type: EventType;
  description: string; // Human readable description
  userId: string; // ID of the actor
  userName: string; // Name of the actor (cached for display)
  timestamp: number;
  metadata?: any; // Extra data like term ID, target user ID etc.
}

// --- Dialect Management ---
export interface DialectItem {
  id: string;
  name: string; // e.g. "Quba"
  description?: string; // e.g. "General / Classic"
}

// --- Auth & User Management ---
export type UserRole = 'admin' | 'approver' | 'user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  joinedAt: number;
  contributionsCount: number;
  // Gamification Stats
  xp: number;
  level: number;
  completedUnits: string[]; // Array of Unit IDs
  currentStreak: number;
  lastLoginDate: number; // To calculate streak
}

// --- Tutor & Curriculum Types ---

export type Dialect = string;
export type ProficiencyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface TutorConfig {
  dialect: Dialect;
  level: ProficiencyLevel;
  userName?: string;
  userId?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  audioText?: string;
  timestamp: number;
}

// --- Interactive Lesson Types ---

export type ExerciseType = 'multiple_choice' | 'flashcard' | 'translate_he_to_ju' | 'translate_ju_to_he';

export interface Exercise {
  id: string;
  type: ExerciseType;
  question: string; // The prompt text
  options?: string[]; // For multiple choice
  correctAnswer: string;
  audioText?: string; // Text to speak for this exercise
  explanation?: string; // Why is this the answer?
}

export interface LessonUnit {
  id: string;
  title: string;
  description: string;
  icon: string; // Lucide icon name or emoji
  order: number;
  requiredLevel: number; // Minimum user level to unlock
}
