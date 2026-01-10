
import { LessonUnit } from '../types';

export const CURRICULUM_UNITS: LessonUnit[] = [
    {
        id: 'unit_greetings',
        title: 'ברכות והיכרות',
        description: 'למד כיצד לומר שלום, תודה ולשאול לשלומו של אדם.',
        icon: 'Hand',
        order: 1,
        requiredLevel: 1
    },
    {
        id: 'unit_family',
        title: 'המשפחה הג\'והורית',
        description: 'מילים לתיאור אבא, אמא, סבא והיררכיה משפחתית.',
        icon: 'Users',
        order: 2,
        requiredLevel: 1
    },
    {
        id: 'unit_food',
        title: 'אוכל ומסורת',
        description: 'מאכלים, שולחן השבת ומושגים מהמטבח הקווקזי.',
        icon: 'Utensils',
        order: 3,
        requiredLevel: 1
    },
    {
        id: 'unit_numbers',
        title: 'מספרים וזמן',
        description: 'ספירה עד 10, ימות השבוע וזמנים.',
        icon: 'Clock',
        order: 4,
        requiredLevel: 2
    },
    {
        id: 'unit_hospitality',
        title: 'הכנסת אורחים (Hərmət)',
        description: 'ביטויים של כבוד, אירוח ונימוסים.',
        icon: 'Coffee',
        order: 5,
        requiredLevel: 2
    },
    {
        id: 'unit_proverbs',
        title: 'פתגמים וחוכמה',
        description: 'ביטויים עממיים ופתגמים של זקני העדה.',
        icon: 'Scroll',
        order: 6,
        requiredLevel: 3
    }
];
