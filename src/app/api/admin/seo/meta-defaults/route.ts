import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';

// Default meta templates per page type
const DEFAULT_META: Record<string, { titleTemplate: string; description: string }> = {
  home: {
    titleTemplate: "מורשת ג'והורי | המילון לשימור השפה",
    description: "מילון ג'והורי-עברי אינטראקטיבי לשימור שפת יהודי ההרים",
  },
  word: {
    titleTemplate: '{term} - תרגום ג\'והורי | מורשת ג\'והורי',
    description: 'חפש את המשמעות של "{term}" במילון הג\'והורי-עברי',
  },
  recipes: {
    titleTemplate: 'מתכונים קווקזיים מסורתיים | מורשת ג\'והורי',
    description: 'אוסף מתכונים אותנטיים מהמטבח הג\'והורי והקווקזי-יהודי',
  },
  recipe: {
    titleTemplate: '{title} - מתכון | מורשת ג\'והורי',
    description: 'מתכון מסורתי: {title}',
  },
  marketplace: {
    titleTemplate: 'שוק קהילתי - Taste of the Caucasus | מורשת ג\'והורי',
    description: 'שוק האוכל הג\'והורי - מצאו בשלנים ומאכלים קווקזיים אותנטיים באזורכם',
  },
  vendor: {
    titleTemplate: '{name} - שוק | מורשת ג\'והורי',
    description: '{name} בשוק הקהילתי',
  },
  tutor: {
    titleTemplate: 'מורה פרטי AI - לימוד ג\'והורי | מורשת ג\'והורי',
    description: 'למד ג\'והורי עם מורה פרטי מבוסס AI',
  },
  family: {
    titleTemplate: 'שורשים - רשת קהילתית | מורשת ג\'והורי',
    description: 'גלה את הקשרים בין משפחות הקהילה הג\'והורית',
  },
};

// GET /api/admin/seo/meta-defaults - Get meta templates
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);

    const [rows] = await pool.query(
      `SELECT setting_value FROM seo_settings WHERE setting_key = 'meta_defaults'`
    ) as [any[], any];

    if (rows.length > 0) {
      try {
        return NextResponse.json(JSON.parse(rows[0].setting_value));
      } catch { /* fall through */ }
    }

    return NextResponse.json(DEFAULT_META);
  } catch (error) {
    if (error instanceof Response) return error;
    if ((error as any)?.code === 'ER_NO_SUCH_TABLE') {
      return NextResponse.json(DEFAULT_META);
    }
    console.error('Meta defaults error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת תבניות meta' }, { status: 500 });
  }
}

// PUT /api/admin/seo/meta-defaults - Update meta templates
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const meta = await request.json();

    await pool.query(
      `INSERT INTO seo_settings (setting_key, setting_value, updated_by)
       VALUES ('meta_defaults', ?, ?)
       ON DUPLICATE KEY UPDATE
          setting_value = VALUES(setting_value),
          updated_by = VALUES(updated_by),
          updated_at = CURRENT_TIMESTAMP`,
      [JSON.stringify(meta), (user as any).id]
    );

    await pool.query(
      `INSERT INTO system_logs (event_type, description, user_id, user_name)
       VALUES ('SEO_META_CHANGED', 'תבניות Meta עודכנו', ?, ?)`,
      [(user as any).id, (user as any).name]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Meta defaults update error:', error);
    return NextResponse.json({ error: 'שגיאה בעדכון תבניות meta' }, { status: 500 });
  }
}
