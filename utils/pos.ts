/** Map English part-of-speech to Hebrew — single source of truth */
export const POS_HEBREW: Record<string, string> = {
  noun: 'שם עצם',
  verb: 'פועל',
  adjective: 'שם תואר',
  adverb: 'תואר הפועל',
  pronoun: 'כינוי גוף',
  preposition: 'מילת יחס',
  conjunction: 'מילת חיבור',
  interjection: 'מילת קריאה',
  particle: 'מילית',
  numeral: 'שם מספר',
  number: 'שם מספר',
  determiner: 'מילת הגדרה',
  phrase: 'צירוף',
  idiom: 'ניב',
  expression: 'ביטוי',
  // Short-form aliases (DB may still contain these)
  adj: 'שם תואר',
  adv: 'תואר הפועל',
  prep: 'מילת יחס',
  num: 'שם מספר',
  pron: 'כינוי גוף',
  interj: 'מילת קריאה',
  conj: 'מילת חיבור',
  // Compound forms found in data
  'interrogative adverb': 'תואר שאלה',
  'interrogative pronoun': 'כינוי שאלה',
  'interrogative adjective': 'תואר שאלה',
  parenthetical: 'מילה מוסגרת',
};

export const partOfSpeechHebrew = (pos: string): string => {
  const lower = pos.toLowerCase().trim();
  return POS_HEBREW[lower] || pos;
};
