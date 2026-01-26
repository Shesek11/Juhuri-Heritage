#!/usr/bin/env node
// Insert demo recipes directly using JavaScript (not SQL parsing)

require('dotenv').config();
const pool = require('./server/config/db');

const recipes = [
    {
        title: 'דושפרה - כופתאות מרק קווקזיות',
        title_juhuri: 'Dushpara',
        description: 'מרק כופתאות עדין ומחמם מהמטבח הקווקזי-יהודי. המנה האהובה בשבתות ובחגים.',
        story: 'המתכון הזה עבר בתוך המשפחה שלנו כבר 5 דורות. סבתא רבתא רחל הייתה מכינה אותו כל שבת, והילדים היו מתאספים במטבח לעזור בעיצוב הכופתאות הקטנות.',
        ingredients: ["2 כוסות קמח", "1 ביצה", "מלח", "500 גרם בשר טחון", "1 בצל גדול קצוץ דק", "פלפל שחור", "2 כפות שמן זית", "8 כוסות מרק עוף או בשר", "כוסבורה טרייה לקישוט"],
        instructions: ["מערבבים את הקמח עם הביצה, קורט מלח ומעט מים עד לקבלת בצק חלק. מכסים ומניחים למנוח 30 דקות.", "מכינים את המילוי: מערבבים את הבשר הטחון עם הבצל, מלח ופלפל.", "מרדדים את הבצק דק מאוד וחותכים לריבועים קטנים (2x2 ס\"מ).", "שמים כפית קטנה של מילוי במרכז כל ריבוע ומקפלים לצורת משולש. סוגרים היטב את הקצוות.", "מביאים את המרק לרתיחה ומכניסים את הדושפרה בזהירות.", "מבשלים על אש בינונית למשך 15-20 דקות עד שהכופתאות צפות.", "מגישים חם עם כוסבורה טרייה מעל."],
        prep_time: 45,
        cook_time: 20,
        servings: 6,
        difficulty: 'medium',
        tags: ['shabbat', 'traditional', 'meat']
    },
    {
        title: 'פלוב אוזבקי מסורתי',
        title_juhuri: 'Plov Uzbeki',
        description: 'אורז מבושם עם בשר כבש, גזר וצימוקים. מנת החג המפוארת של הקהילה.',
        story: 'בכל ראש השנה, אבא שלי היה מכין את הפלוב הזה בסיר ענק. הריח של הכמון והגזר המקורמל היה ממלא את כל השכונה. זה היה הסימן שהחג מתקרב.',
        ingredients: ["1 ק\"ג בשר כבש חתוך לקוביות", "1 ק\"ג גזר חתוך לרצועות", "500 גרם בצל חתוך", "800 גרם אורז בסמטי", "כוס שמן צמחי", "ראש שום שלם", "2 כפות כמון שלם", "2 כפות זירה", "מלח ופלפל", "חצי כוס צימוקים", "כוס חומוס מבושל"],
        instructions: ["בסיר עמוק וכבד, מחממים את השמן ומזהיבים את הבצל.", "מוסיפים את הבשר ומטגנים עד שמשחים מכל הצדדים.", "מוסיפים את הגזר ומטגנים עד שמתרכך ומקבל צבע זהוב יפה.", "מוסיפים את התבלינים, מלח ופלפל ומערבבים היטב.", "מוסיפים מים עד שמכסה את הבשר, מביאים לרתיחה ומבשלים 40 דקות.", "שוטפים את האורז היטב ומוסיפים מעל הבשר והגזר. לא מערבבים!", "דוחפים את ראש השום השלם לתוך האורז.", "מוסיפים מים רותחים עד שמכסה את האורז ב-2 ס\"מ.", "מבשלים על אש גבוהה עד שהמים נספגים, אז מנמיכים לאש נמוכה.", "מכסים במכסה ומבשלים עוד 20-25 דקות.", "לפני ההגשה מערבבים בעדינות ומפזרים את הצימוקים והחומוס."],
        prep_time: 30,
        cook_time: 90,
        servings: 8,
        difficulty: 'hard',
        tags: ['holiday', 'festive', 'traditional', 'meat']
    },
    {
        title: 'קוטב עם עשבי תיבול',
        title_juhuri: 'Qutab',
        description: 'לביבות דקות ממולאות בעשבי תיבול טריים. חטיף מושלם או מנה ראשונה.',
        story: 'כשהייתי ילדה, אמא שלי הייתה שולחת אותי לשוק לקנות עשבי תיבול טריים בכל בוקר שישי. הקוטב היה תמיד על השולחן בסעודת ליל שבת.',
        ingredients: ["3 כוסות קמח", "מים פושרים", "מלח", "חבילה גדולה של כוסבורה", "חבילה של שמיר", "חבילה של נענע", "2 בצלים ירוקים", "100 גרם חמאה מומסת"],
        instructions: ["מכינים בצק: מערבבים קמח, מלח ומים עד לבצק חלק. מכסים ומניחים למנוח 30 דקות.", "קוצצים דק מאוד את כל עשבי התיבול והבצל הירוק.", "מערבבים את העשבים עם מעט מלח.", "מחלקים את הבצק לכדורים קטנים ומרדדים כל כדור לעיגול דק.", "שמים מילוי עשבים על חצי מהעיגול ומקפלים לחצי עיגול. סוגרים היטב את הקצוות.", "מחממים מחבת יבשה (ללא שמן) ומטגנים את הקוטב משני הצדדים עד לנקודות חומות.", "מברישים במברשת בחמאה מומסת מיד לאחר ההוצאה מהמחבת.", "מגישים חם עם יוגורט או לבנה."],
        prep_time: 40,
        cook_time: 25,
        servings: 6,
        difficulty: 'medium',
        tags: ['shabbat', 'traditional', 'easy']
    },
    {
        title: 'שאח פלוב - אורז עם דג',
        title_juhuri: 'Shakh-Plov',
        description: 'גרסה חגיגית של פלוב עם דג, מוגשת באירועים מיוחדים.',
        story: 'בחתונה של אחותי, הכנו 10 סירים של שאח פלוב הזה. זה היה הכוכב של הארוחה והכל ביקשו את המתכון!',
        ingredients: ["1 ק\"ג פילה דג לבן (אמנון או בורי)", "600 גרם אורז", "3 בצלים גדולים", "שמן לטיגון", "כף כורכום", "כף זעפרן", "מלח ופלפל", "חצי כוס צימוקים", "חצי כוס שקדים פרוסים", "ביצה מבושלת לקישוט"],
        instructions: ["חותכים את הדג לנתחים ומתבלים במלח, פלפל וכורכום.", "מטגנים את הדג בשמן עד לזהוב קלות ושומרים בצד.", "בסיר גדול, מזהיבים את הבצל הפרוס.", "מוסיפים את האורז השטוף ומטגנים דקה.", "מוסיפים מים רותחים (פי 2 מנפח האורז), זעפרן, מלח ופלפל.", "מניחים את נתחי הדג מעל האורז.", "מכסים ומבשלים על אש נמוכה 25 דקות.", "מטגנים את השקדים והצימוקים בשמן עד לזהוב.", "מגישים את האורז והדג עם השקדים, צימוקים וביצה פרוסה."],
        prep_time: 25,
        cook_time: 35,
        servings: 6,
        difficulty: 'easy',
        tags: ['holiday', 'festive', 'fish']
    },
    {
        title: 'פחלווה קווקזית',
        title_juhuri: 'Pakhlava',
        description: 'עוגת שכבות עם אגוזים ודבש. קינוח המלך של החגים.',
        story: 'סבתא רחל הייתה מכינה 5 תבניות של פחלווה לפסח. הילדים היו מחכים כל השנה לרגע הזה!',
        ingredients: ["500 גרם בצק פילו", "300 גרם חמאה מומסת", "500 גרם אגוזי מלך טחונים", "200 גרם סוכר", "כף קינמון", "2 כוסות דבש", "כוס מים", "מיץ חצי לימון", "קרדמון טחון"],
        instructions: ["מערבבים את האגוזים עם מחצית הסוכר והקינמון.", "משמנים תבנית בחמאה.", "שוכבים 10 דפי פילו, כל אחד משומן בחמאה.", "מפזרים שכבה דקה של אגוזים.", "חוזרים על התהליך 3-4 פעמים.", "מכסים ב-10 דפי פילו אחרונים משומנים.", "חותכים למעויינים לפני האפייה.", "אופים בחום 160 מעלות למשך 40 דקות עד לזהוב.", "מכינים סירופ: מבשלים דבש, מים, סוכר ולימון 10 דקות.", "מוזגים את הסירופ החם על הפחלווה הקרה.", "מפזרים קרדמון ונותנים לספוג 3-4 שעות."],
        prep_time: 30,
        cook_time: 40,
        servings: 16,
        difficulty: 'medium',
        tags: ['holiday', 'dessert', 'traditional']
    }
];

const tags = [
    { name: 'shabbat', name_hebrew: 'שבת', icon: '🕯️', color: '#4F46E5' },
    { name: 'holiday', name_hebrew: 'חג', icon: '🎉', color: '#DC2626' },
    { name: 'meat', name_hebrew: 'בשרי', icon: '🥩', color: '#991B1B' },
    { name: 'fish', name_hebrew: 'דגים', icon: '🐟', color: '#0891B2' },
    { name: 'dessert', name_hebrew: 'קינוח', icon: '🍰', color: '#DB2777' },
    { name: 'traditional', name_hebrew: 'מסורתי', icon: '👴', color: '#059669' },
    { name: 'easy', name_hebrew: 'קל להכנה', icon: '✅', color: '#16A34A' },
    { name: 'festive', name_hebrew: 'חגיגי', icon: '🎊', color: '#EA580C' }
];

async function seedRecipes() {
    console.log('🌱 מכניס נתוני דמו למסד נתונים...');

    try {
        const connection = await pool.getConnection();

        // Check if recipes already exist
        const [existing] = await connection.query('SELECT COUNT(*) as count FROM recipes');
        if (existing[0].count > 0) {
            console.log(`⚠️  כבר יש ${existing[0].count} מתכונים במסד הנתונים`);
            console.log('האם ברצונך למחוק את המתכונים הקיימים ולהכניס את הדמו? (Ctrl+C לביטול)');
            // Wait 5 seconds
            await new Promise(resolve => setTimeout(resolve, 5000));
            await connection.query('DELETE FROM recipe_tag_map');
            await connection.query('DELETE FROM recipe_comments');
            await connection.query('DELETE FROM recipe_likes');
            await connection.query('DELETE FROM recipe_photos');
            await connection.query('DELETE FROM recipes');
            console.log('✅ מתכונים קיימים נמחקו');
        }

        // Insert tags first
        console.log('\n📝 מכניס תגיות...');
        for (const tag of tags) {
            await connection.query(
                'INSERT IGNORE INTO recipe_tags (name, name_hebrew, icon, color) VALUES (?, ?, ?, ?)',
                [tag.name, tag.name_hebrew, tag.icon, tag.color]
            );
        }
        console.log(`✅ ${tags.length} תגיות הוכנסו`);

        // Get tag IDs
        const [tagRows] = await connection.query('SELECT id, name FROM recipe_tags');
        const tagMap = {};
        tagRows.forEach(row => {
            tagMap[row.name] = row.id;
        });

        // Insert recipes
        console.log('\n📝 מכניס מתכונים...');
        for (let i = 0; i < recipes.length; i++) {
            const recipe = recipes[i];

            const [result] = await connection.query(
                `INSERT INTO recipes (
                    title, title_juhuri, description, story,
                    ingredients, instructions,
                    prep_time, cook_time, servings, difficulty,
                    user_id, is_approved, is_featured, view_count,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
                [
                    recipe.title,
                    recipe.title_juhuri,
                    recipe.description,
                    recipe.story,
                    JSON.stringify(recipe.ingredients),
                    JSON.stringify(recipe.instructions),
                    recipe.prep_time,
                    recipe.cook_time,
                    recipe.servings,
                    recipe.difficulty,
                    i === 0 || i === 1 || i === 4 ? 1 : 0, // is_featured
                    Math.floor(Math.random() * 100) + 30, // view_count
                    (i + 1) * 7 // days ago
                ]
            );

            const recipeId = result.insertId;

            // Insert tags for this recipe
            for (const tagName of recipe.tags) {
                if (tagMap[tagName]) {
                    await connection.query(
                        'INSERT INTO recipe_tag_map (recipe_id, tag_id) VALUES (?, ?)',
                        [recipeId, tagMap[tagName]]
                    );
                }
            }

            console.log(`   ✓ ${recipe.title}`);
        }

        // Add some sample likes and comments
        console.log('\n📝 מוסיף לייקים והערות...');
        const [recipeIds] = await connection.query('SELECT id FROM recipes LIMIT 3');

        for (const row of recipeIds) {
            // Add likes
            await connection.query(
                'INSERT IGNORE INTO recipe_likes (recipe_id, user_id) VALUES (?, 1)',
                [row.id]
            );

            // Add comment
            if (Math.random() > 0.5) {
                await connection.query(
                    'INSERT INTO recipe_comments (recipe_id, user_id, content, created_at) VALUES (?, 1, ?, DATE_SUB(NOW(), INTERVAL ? DAY))',
                    [row.id, 'מתכון מדהים! יצא בדיוק כמו אצל סבתא שלי ❤️', Math.floor(Math.random() * 5)]
                );
            }
        }

        connection.release();

        console.log('\n✅ נתוני הדמו הוכנסו בהצלחה!');
        console.log('📊 נוספו:');
        console.log(`   • ${recipes.length} מתכונים מסורתיים`);
        console.log(`   • ${tags.length} תגיות`);
        console.log('   • הערות ולייקים לדוגמה');
        console.log('\n🎉 המערכת מוכנה לשימוש!');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ שגיאה:', error.message);
        console.error(error);
        process.exit(1);
    }
}

seedRecipes();
