
// Leitner 5-Box Spaced Repetition Service

// Box review intervals in days
export const LEITNER_INTERVALS: Record<number, number> = {
  1: 0,   // Same session / immediately
  2: 1,   // 1 day
  3: 3,   // 3 days
  4: 7,   // 7 days
  5: 14,  // 14 days (mastered)
};

/**
 * Calculate next review date based on Leitner box
 */
export function getNextReviewDate(box: number): Date {
  const now = new Date();
  const days = LEITNER_INTERVALS[box] || 0;
  now.setDate(now.getDate() + days);
  return now;
}

/**
 * Process answer: returns new box number
 * Correct = move up one box (max 5)
 * Incorrect = back to box 1
 */
export function processAnswer(currentBox: number, isCorrect: boolean): number {
  if (isCorrect) {
    return Math.min(currentBox + 1, 5);
  }
  return 1;
}

/**
 * Format date for MySQL DATETIME
 */
export function formatMySQLDate(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}
