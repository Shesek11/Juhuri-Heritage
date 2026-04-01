import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireRole } from '@/src/lib/auth';
import { logEvent } from '@/src/lib/logEvent';

const EMAIL_EVENTS = [
  { slug: 'welcome', name: 'ברוכים הבאים', description: 'נשלח למשתמש חדש אחרי הרשמה', recipient: 'user', trigger: 'הרשמה (אימייל/Google/Facebook)', wired: true },
  { slug: 'contact-form', name: 'הודעת יצירת קשר', description: 'נשלח לאדמין כשמישהו שולח טופס יצירת קשר', recipient: 'admin', trigger: 'שליחת טופס יצירת קשר', wired: true },
  { slug: 'password-reset', name: 'איפוס סיסמה', description: 'נשלח למשתמש עם קישור לאיפוס סיסמה', recipient: 'user', trigger: 'בקשת איפוס סיסמה', wired: true },
  { slug: 'suggestion-approved', name: 'הצעת תרגום אושרה', description: 'נשלח למשתמש כשהצעת תרגום שלו אושרה', recipient: 'user', trigger: 'אישור הצעת תרגום', wired: true },
  { slug: 'suggestion-rejected', name: 'הצעת תרגום נדחתה', description: 'נשלח למשתמש כשהצעת תרגום שלו נדחתה', recipient: 'user', trigger: 'דחיית הצעת תרגום', wired: true },
  { slug: 'suggestion-submitted', name: 'הצעת תרגום חדשה', description: 'נשלח לאדמין כשמשתמש מגיש הצעת תרגום', recipient: 'admin', trigger: 'הגשת הצעת תרגום', wired: true },
  { slug: 'comment-approved', name: 'תגובה אושרה', description: 'נשלח למגיב כשתגובתו אושרה', recipient: 'user', trigger: 'אישור תגובה', wired: true },
  { slug: 'recipe-submitted', name: 'מתכון חדש', description: 'נשלח לאדמין כשמשתמש מגיש מתכון', recipient: 'admin', trigger: 'הגשת מתכון', wired: true },
  { slug: 'recipe-approved', name: 'מתכון אושר', description: 'נשלח למשתמש כשמתכון שלו אושר', recipient: 'user', trigger: 'אישור מתכון', wired: true },
  { slug: 'entry-approved', name: 'ערך מילוני אושר', description: 'נשלח לתורם כשערך שהוגש אושר', recipient: 'user', trigger: 'אישור ערך מילוני', wired: true },
  { slug: 'family-link-request', name: 'בקשת קישור משפחתי', description: 'נשלח לבעל הרשומה כשמישהו מבקש קישור', recipient: 'user', trigger: 'הגשת בקשת קישור', wired: true },
  { slug: 'family-link-approved', name: 'קישור משפחתי אושר', description: 'נשלח למבקש כשבקשת הקישור אושרה', recipient: 'user', trigger: 'אישור בקשת קישור', wired: true },
  { slug: 'family-link-rejected', name: 'קישור משפחתי נדחה', description: 'נשלח למבקש כשבקשת הקישור נדחתה', recipient: 'user', trigger: 'דחיית בקשת קישור', wired: true },
  { slug: 'word-submitted', name: 'מילה חדשה הוגשה', description: 'נשלח לאדמין כשמישהו מוסיף מילה חדשה', recipient: 'admin', trigger: 'הוספת מילה חדשה', wired: true },
  { slug: 'field-suggested', name: 'הצעת שדה חדשה', description: 'נשלח לאדמין כשמישהו מציע תיקון שדה', recipient: 'admin', trigger: 'הצעת תיקון שדה', wired: true },
  { slug: 'merge-suggested', name: 'הצעת מיזוג כפולים', description: 'נשלח לאדמין כשמישהו מציע מיזוג ערכים כפולים', recipient: 'admin', trigger: 'הצעת מיזוג', wired: true },
  { slug: 'comment-submitted', name: 'תגובה חדשה', description: 'נשלח לאדמין כשתגובת אורח ממתינה לאישור', recipient: 'admin', trigger: 'הגשת תגובת אורח', wired: true },
  { slug: 'comment-rejected', name: 'תגובה נדחתה', description: 'נשלח למגיב כשתגובתו נדחתה', recipient: 'user', trigger: 'דחיית תגובה', wired: true },
  { slug: 'example-submitted', name: 'פתגם חדש הוגש', description: 'נשלח לאדמין כשמישהו מגיש פתגם/דוגמה', recipient: 'admin', trigger: 'הגשת פתגם', wired: true },
  { slug: 'example-approved', name: 'פתגם אושר', description: 'נשלח לתורם כשהפתגם שלו אושר', recipient: 'user', trigger: 'אישור פתגם', wired: true },
  { slug: 'recording-approved', name: 'הקלטה אושרה', description: 'נשלח למשתמש כשהקלטה שלו אושרה', recipient: 'user', trigger: 'אישור הקלטה', wired: true },
  { slug: 'recording-rejected', name: 'הקלטה נדחתה', description: 'נשלח למשתמש כשהקלטה שלו נדחתה', recipient: 'user', trigger: 'דחיית הקלטה', wired: true },
  { slug: 'recording-submitted', name: 'הקלטה חדשה', description: 'נשלח לאדמין כשהקלטה ממתינה לאישור', recipient: 'admin', trigger: 'הגשת הקלטה (אורח)', wired: true },
  { slug: 'role-changed', name: 'שינוי תפקיד', description: 'נשלח למשתמש כשתפקידו השתנה', recipient: 'user', trigger: 'שינוי תפקיד ע"י אדמין', wired: true },
  { slug: 'recipe-rejected', name: 'מתכון נדחה', description: 'נשלח למשתמש כשמתכון שלו נדחה', recipient: 'user', trigger: 'דחיית מתכון', wired: true },
  { slug: 'newsletter', name: 'ניוזלטר', description: 'עדכון תקופתי למנויים', recipient: 'subscribers', trigger: 'שליחה ידנית', wired: false },
];

// GET /api/admin/email-templates/triggers
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);

    const [templates] = await pool.query(
      'SELECT id, slug, name, is_active, to_type, to_address, updated_at FROM email_templates'
    ) as any[];

    const [mappings] = await pool.query(
      'SELECT event_slug, template_id FROM email_event_mappings'
    ) as any[];

    const templateMap = new Map(templates.map((t: any) => [t.slug, t]));
    const templateById = new Map(templates.map((t: any) => [t.id, t]));
    const mappingMap = new Map(mappings.map((m: any) => [m.event_slug, m.template_id]));

    const triggers = EMAIL_EVENTS.map(event => {
      const customTemplateId = mappingMap.get(event.slug);
      const customTemplate = customTemplateId ? templateById.get(customTemplateId) : null;
      const defaultTemplate = templateMap.get(event.slug) as any;
      const activeTemplate = customTemplate || defaultTemplate;

      return {
        ...event,
        hasTemplate: !!activeTemplate,
        isActive: activeTemplate?.is_active === 1,
        templateName: activeTemplate?.name || null,
        templateSlug: activeTemplate?.slug || null,
        templateId: activeTemplate?.id || null,
        isCustomMapping: !!customTemplate,
        defaultTemplateSlug: event.slug,
        lastUpdated: activeTemplate?.updated_at || null,
      };
    });

    return NextResponse.json({ triggers, templates });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 });
  }
}

// PUT /api/admin/email-templates/triggers — update mapping
export async function PUT(request: NextRequest) {
  try {
    const user = await requireRole(request, ['admin']);
    const { eventSlug, templateId } = await request.json();

    if (!eventSlug) {
      return NextResponse.json({ error: 'חסר eventSlug' }, { status: 400 });
    }

    if (templateId === null || templateId === undefined) {
      // Remove custom mapping — revert to default
      await pool.query('DELETE FROM email_event_mappings WHERE event_slug = ?', [eventSlug]);
    } else {
      // Upsert mapping
      await pool.query(
        `INSERT INTO email_event_mappings (event_slug, template_id) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE template_id = ?, updated_at = NOW()`,
        [eventSlug, templateId, templateId]
      );
    }

    await logEvent('EMAIL_TRIGGER_UPDATED', `טריגר אימייל עודכן: ${eventSlug}`, user, { eventSlug, templateId }, request);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: 'שגיאה בעדכון' }, { status: 500 });
  }
}
