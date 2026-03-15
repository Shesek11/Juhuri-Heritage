
import { CurriculumSection, LessonUnit, ExerciseType } from '../types';

export const CURRICULUM_SECTIONS: CurriculumSection[] = [
  {
    id: 'section_foundations',
    title: 'יסודות',
    description: 'מילים בסיסיות להתחלת הדרך',
    order: 1,
    units: [
      { id: 'unit_greetings', title: 'ברכות והיכרות', description: 'שלום, תודה, מה שלומך', icon: 'Hand', order: 1, sectionId: 'section_foundations', culturalNote: 'בקהילה הג\'והורית, ברכת השלום היא טקסית ומכבדת. הגברים לוחצים ידיים ומתחבקים, ואומרים "שולום עלייכם".', culturalLink: '/dictionary' },
      { id: 'unit_numbers', title: 'מספרים 1-10', description: 'ספירה בסיסית ומספרים', icon: 'Hash', order: 2, sectionId: 'section_foundations' },
      { id: 'unit_colors', title: 'צבעים', description: 'שמות הצבעים בג\'והורי', icon: 'Palette', order: 3, sectionId: 'section_foundations' },
      { id: 'unit_family', title: 'משפחה', description: 'אבא, אמא, סבא ובני משפחה', icon: 'Users', order: 4, sectionId: 'section_foundations', culturalNote: 'המשפחה הג\'והורית היא יחידה מרכזית בחיי הקהילה. כבוד הורים וזקנים הוא ערך עליון.', culturalLink: '/family' },
    ],
  },
  {
    id: 'section_daily',
    title: 'חיי יום-יום',
    description: 'מילים לשימוש יומיומי',
    order: 2,
    units: [
      { id: 'unit_food_basic', title: 'אוכל בסיסי', description: 'פירות, ירקות ומאכלים', icon: 'Apple', order: 5, sectionId: 'section_daily', culturalNote: 'המטבח הג\'והורי עשיר בתבלינים וטעמים מהקווקז. כורכום, כמון וקינמון הם בסיס לרוב המנות.', culturalLink: '/recipes' },
      { id: 'unit_home', title: 'בבית', description: 'חפצים, חדרים ופעולות בבית', icon: 'Home', order: 6, sectionId: 'section_daily' },
      { id: 'unit_body', title: 'הגוף', description: 'איברי הגוף ותחושות', icon: 'HeartPulse', order: 7, sectionId: 'section_daily' },
      { id: 'unit_clothing', title: 'בגדים', description: 'לבוש מסורתי ומודרני', icon: 'Shirt', order: 8, sectionId: 'section_daily' },
    ],
  },
  {
    id: 'section_culture',
    title: 'תרבות ומסורת',
    description: 'מילים מעולם המסורת והתרבות',
    order: 3,
    units: [
      { id: 'unit_shabbat', title: 'שולחן השבת', description: 'מאכלים, ברכות וכלים של שבת', icon: 'Flame', order: 9, sectionId: 'section_culture', culturalNote: 'שולחן השבת הג\'והורי מלא במאכלים מסורתיים: פיתי, חביצי, דולמה, קובה ועוד.', culturalLink: '/recipes' },
      { id: 'unit_holidays', title: 'חגים', description: 'פסח, ראש השנה ומועדים', icon: 'Star', order: 10, sectionId: 'section_culture' },
      { id: 'unit_hospitality', title: 'הכנסת אורחים', description: 'ביטויים של כבוד ואירוח', icon: 'Coffee', order: 11, sectionId: 'section_culture', culturalNote: 'הכנסת אורחים (חרמט) היא ערך עליון. אורח מקבל את הכיסא הטוב ביותר והאוכל הטוב ביותר.' },
      { id: 'unit_nature', title: 'טבע וסביבה', description: 'חיות, צמחים ומזג אוויר', icon: 'TreePine', order: 12, sectionId: 'section_culture' },
    ],
  },
  {
    id: 'section_expressions',
    title: 'ביטויים וחוכמה',
    description: 'ביטויים, פתגמים ושירה',
    order: 4,
    units: [
      { id: 'unit_daily_expressions', title: 'ביטויים יומיומיים', description: 'ביטויים נפוצים ושימושיים', icon: 'MessageSquare', order: 13, sectionId: 'section_expressions' },
      { id: 'unit_proverbs', title: 'פתגמים', description: 'חוכמה עממית של זקני העדה', icon: 'Scroll', order: 14, sectionId: 'section_expressions', culturalNote: 'הפתגמים הג\'והוריים משקפים חוכמת דורות מהרי הקווקז. כל פתגם מלמד ערך או מוסר.', culturalLink: '/dictionary' },
      { id: 'unit_songs', title: 'שירים ושירות', description: 'מילים משירים מסורתיים', icon: 'Music', order: 15, sectionId: 'section_expressions' },
    ],
  },
];

// Flat list of all units
export const CURRICULUM_UNITS: LessonUnit[] = CURRICULUM_SECTIONS.flatMap(s => s.units);

// Get unit by ID
export function getUnit(unitId: string): LessonUnit | undefined {
  return CURRICULUM_UNITS.find(u => u.id === unitId);
}

// Get section for a unit
export function getSectionForUnit(unitId: string): CurriculumSection | undefined {
  return CURRICULUM_SECTIONS.find(s => s.units.some(u => u.id === unitId));
}

// Get the next unit
export function getNextUnit(unitId: string): LessonUnit | undefined {
  const idx = CURRICULUM_UNITS.findIndex(u => u.id === unitId);
  if (idx === -1 || idx >= CURRICULUM_UNITS.length - 1) return undefined;
  return CURRICULUM_UNITS[idx + 1];
}

// Check if unit is first in its section
export function isFirstInSection(unitId: string): boolean {
  return CURRICULUM_SECTIONS.some(s => s.units[0]?.id === unitId);
}

// Get previous section's last unit
export function getPreviousSectionLastUnit(unitId: string): LessonUnit | undefined {
  const section = getSectionForUnit(unitId);
  if (!section || section.order === 1) return undefined;
  const prevSection = CURRICULUM_SECTIONS.find(s => s.order === section.order - 1);
  if (!prevSection) return undefined;
  return prevSection.units[prevSection.units.length - 1];
}

// Mastery level config
export const MASTERY_LEVELS = {
  0: { name: 'לא הושלם', color: 'slate', minAccuracy: 0 },
  1: { name: 'ברונזה', color: 'amber-600', minAccuracy: 60 },
  2: { name: 'כסף', color: 'slate-300', minAccuracy: 70 },
  3: { name: 'זהב', color: 'yellow-400', minAccuracy: 80 },
  4: { name: 'פלטינום', color: 'cyan-300', minAccuracy: 90 },
  5: { name: 'יהלום', color: 'purple-400', minAccuracy: 95 },
} as const;

// Exercise types per mastery level
export const EXERCISES_BY_MASTERY: Record<number, ExerciseType[]> = {
  1: ['multiple_choice', 'matching_pairs', 'context_association', 'true_false_flash'],
  2: ['multiple_choice', 'matching_pairs', 'audio_recognition', 'context_association', 'word_bank_ju_to_he', 'true_false_flash'],
  3: ['word_bank_he_to_ju', 'word_bank_ju_to_he', 'fill_blank', 'audio_recognition', 'listen_select', 'multiple_choice'],
  4: ['spelling_challenge', 'dictation', 'speed_match', 'fill_blank', 'word_bank_he_to_ju', 'listen_select'],
  5: ['multiple_choice', 'matching_pairs', 'word_bank_he_to_ju', 'spelling_challenge', 'dictation', 'speed_match', 'fill_blank', 'listen_select', 'true_false_flash'],
};
