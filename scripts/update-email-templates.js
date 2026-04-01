const db = require('../server/config/db');

async function run() {
  // ============================================
  // PART 1: Update existing template HTML bodies
  // ============================================

  const updates = [
    // 1. contact-form - add admin button
    {
      slug: 'contact-form',
      html: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 24px; border-radius: 12px 12px 0 0;"><h2 style="color: #fbbf24; margin: 0;">הודעה חדשה מטופס יצירת קשר</h2></div><div style="background: #fff; padding: 24px; border: 1px solid #e2e8f0;"><table style="border-collapse: collapse; width: 100%;"><tr><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #475569;">קטגוריה</td><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9;">{{category}}</td></tr><tr><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #475569;">שם</td><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9;">{{userName}}</td></tr><tr><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #475569;">אימייל</td><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9;">{{userEmail}}</td></tr><tr><td style="padding: 10px 12px; font-weight: bold; color: #475569;">עמוד</td><td style="padding: 10px 12px;">{{pageUrl}}</td></tr></table><div style="margin-top: 20px; padding: 16px; background: #f8fafc; border-radius: 8px; border-right: 4px solid #fbbf24;"><p style="margin: 0; white-space: pre-wrap; color: #1e293b;">{{message}}</p></div><div style="text-align: center; margin: 24px 0;"><a href="https://jun-juhuri.com/admin" style="background: #fbbf24; color: #1e293b; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">לוח ניהול</a></div></div><div style="background: #f1f5f9; padding: 16px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px; color: #94a3b8;">Juhuri Heritage - jun-juhuri.com</div></div>`,
    },
    // 2. comment-approved - add greeting, term, link
    {
      slug: 'comment-approved',
      html: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 24px; border-radius: 12px 12px 0 0;"><h2 style="color: #22c55e; margin: 0;">התגובה שלך אושרה!</h2></div><div style="background: #fff; padding: 32px; border: 1px solid #e2e8f0;"><p style="color: #1e293b;">שלום {{userName}},</p><p style="color: #475569;">התגובה שהשארת על המילה <strong>{{term}}</strong> אושרה ופורסמה באתר.</p><p style="color: #475569;">תודה על התרומה לקהילה!</p><div style="text-align: center; margin: 24px 0;"><a href="https://jun-juhuri.com/he/word/{{term}}" style="background: #22c55e; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">צפייה בתגובה</a></div></div><div style="background: #f1f5f9; padding: 16px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px; color: #94a3b8;">Juhuri Heritage - jun-juhuri.com</div></div>`,
    },
    // 3. comment-rejected - add context
    {
      slug: 'comment-rejected',
      html: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 24px; border-radius: 12px 12px 0 0;"><h2 style="color: #fbbf24; margin: 0;">עדכון לגבי התגובה שלך</h2></div><div style="background: #fff; padding: 32px; border: 1px solid #e2e8f0;"><p style="color: #1e293b;">שלום {{userName}},</p><p style="color: #475569;">התגובה שהשארת על המילה <strong>{{term}}</strong> לא אושרה לפרסום.</p><div style="padding: 12px 16px; background: #f8fafc; border-radius: 8px; border-right: 4px solid #fbbf24; margin: 16px 0;"><p style="margin: 0; color: #64748b; font-size: 14px;">{{commentContent}}</p></div><p style="color: #475569;">אנו מעודדים אותך להמשיך לתרום לקהילה. ניתן להגיש תגובה חדשה בכל עת.</p></div><div style="background: #f1f5f9; padding: 16px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px; color: #94a3b8;">Juhuri Heritage - jun-juhuri.com</div></div>`,
    },
    // 4. entry-approved - add greeting
    {
      slug: 'entry-approved',
      html: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 24px; border-radius: 12px 12px 0 0;"><h2 style="color: #22c55e; margin: 0;">המילה שהגשת אושרה!</h2></div><div style="background: #fff; padding: 32px; border: 1px solid #e2e8f0;"><p style="color: #1e293b;">שלום {{userName}},</p><p style="color: #475569;">המילה <strong>{{term}}</strong> אושרה והתווספה למילון.</p><p style="color: #475569;">תודה על התרומה לשימור השפה!</p><div style="text-align: center; margin: 24px 0;"><a href="https://jun-juhuri.com/he/word/{{term}}" style="background: #22c55e; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">צפייה במילה</a></div></div><div style="background: #f1f5f9; padding: 16px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px; color: #94a3b8;">Juhuri Heritage - jun-juhuri.com</div></div>`,
    },
    // 5. example-approved - add proverb + word link
    {
      slug: 'example-approved',
      html: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 24px; border-radius: 12px 12px 0 0;"><h2 style="color: #22c55e; margin: 0;">הפתגם שלך אושר!</h2></div><div style="background: #fff; padding: 32px; border: 1px solid #e2e8f0;"><p style="color: #1e293b;">שלום {{userName}},</p><p style="color: #475569;">הפתגם שהגשת עבור המילה <strong>{{term}}</strong> אושר ופורסם באתר:</p><div style="padding: 12px 16px; background: #f8fafc; border-radius: 8px; border-right: 4px solid #22c55e; margin: 16px 0;"><p style="margin: 0; color: #1e293b; font-weight: bold;">{{origin}}</p></div><p style="color: #475569;">תודה על התרומה לשימור המסורת!</p><div style="text-align: center; margin: 24px 0;"><a href="https://jun-juhuri.com/he/word/{{term}}" style="background: #22c55e; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">צפייה בפתגם</a></div></div><div style="background: #f1f5f9; padding: 16px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px; color: #94a3b8;">Juhuri Heritage - jun-juhuri.com</div></div>`,
    },
    // 6. recipe-approved - add recipe link
    {
      slug: 'recipe-approved',
      html: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 24px; border-radius: 12px 12px 0 0;"><h2 style="color: #22c55e; margin: 0;">המתכון שלך אושר!</h2></div><div style="background: #fff; padding: 32px; border: 1px solid #e2e8f0;"><p style="color: #1e293b;">שלום {{userName}},</p><p style="color: #475569;">המתכון <strong>{{recipeTitle}}</strong> אושר ופורסם באתר.</p><p style="color: #475569;">תודה על התרומה לשימור המטבח הקווקזי!</p><div style="text-align: center; margin: 24px 0;"><a href="https://jun-juhuri.com/he/recipes/{{recipeId}}" style="background: #22c55e; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">צפייה במתכון</a></div></div><div style="background: #f1f5f9; padding: 16px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px; color: #94a3b8;">Juhuri Heritage - jun-juhuri.com</div></div>`,
    },
    // 7. suggestion-submitted - add term name
    {
      slug: 'suggestion-submitted',
      html: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 24px; border-radius: 12px 12px 0 0;"><h2 style="color: #fbbf24; margin: 0;">הצעת תרגום חדשה</h2></div><div style="background: #fff; padding: 32px; border: 1px solid #e2e8f0;"><p style="color: #1e293b;">הצעה חדשה התקבלה מ-<strong>{{userName}}</strong>:</p><table style="border-collapse: collapse; width: 100%;"><tr><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #475569;">מילה</td><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9;">{{term}}</td></tr><tr><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #475569;">ניב</td><td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9;">{{dialect}}</td></tr><tr><td style="padding: 10px 12px; font-weight: bold; color: #475569;">תרגום</td><td style="padding: 10px 12px;">{{hebrew}}</td></tr></table><div style="text-align: center; margin: 24px 0;"><a href="https://jun-juhuri.com/admin" style="background: #fbbf24; color: #1e293b; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">לוח ניהול</a></div></div><div style="background: #f1f5f9; padding: 16px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px; color: #94a3b8;">Juhuri Heritage - jun-juhuri.com</div></div>`,
    },
    // 8. family-link-rejected - add contact link
    {
      slug: 'family-link-rejected',
      html: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 24px; border-radius: 12px 12px 0 0;"><h2 style="color: #fbbf24; margin: 0;">עדכון לגבי בקשת הקישור</h2></div><div style="background: #fff; padding: 32px; border: 1px solid #e2e8f0;"><p style="color: #1e293b;">שלום {{userName}},</p><p style="color: #475569;">בקשת הקישור המשפחתי שלך לא אושרה.</p><p style="color: #475569;">אם את/ה חושב/ת שמדובר בטעות, ניתן ליצור קשר דרך האתר.</p><div style="text-align: center; margin: 24px 0;"><a href="https://jun-juhuri.com/he/contact" style="background: #fbbf24; color: #1e293b; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">צור קשר</a></div></div><div style="background: #f1f5f9; padding: 16px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px; color: #94a3b8;">Juhuri Heritage - jun-juhuri.com</div></div>`,
    },
  ];

  for (const u of updates) {
    await db.query('UPDATE email_templates SET html_body = ? WHERE slug = ?', [u.html, u.slug]);
    console.log(`Updated: ${u.slug}`);
  }

  // ============================================
  // PART 2: Activate inactive templates
  // ============================================
  await db.query("UPDATE email_templates SET is_active = 1 WHERE slug IN ('welcome', 'password-reset', 'suggestion-approved', 'suggestion-rejected')");
  console.log('Activated: welcome, password-reset, suggestion-approved, suggestion-rejected');

  // ============================================
  // PART 3: Insert new templates
  // ============================================
  const newTemplates = [
    {
      slug: 'recording-submitted',
      name: 'הקלטה חדשה ממתינה',
      subject: 'הקלטה חדשה ממתינה לאישור — {{term}}',
      to_type: 'admin',
      html: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 24px; border-radius: 12px 12px 0 0;"><h2 style="color: #fbbf24; margin: 0;">הקלטה חדשה ממתינה לאישור</h2></div><div style="background: #fff; padding: 32px; border: 1px solid #e2e8f0;"><p style="color: #1e293b;">הקלטה חדשה הוגשה על ידי <strong>{{guestName}}</strong> עבור המילה <strong>{{term}}</strong>.</p><p style="color: #475569;">ההקלטה ממתינה לבדיקה ואישור.</p><div style="text-align: center; margin: 24px 0;"><a href="https://jun-juhuri.com/admin" style="background: #fbbf24; color: #1e293b; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">לוח ניהול</a></div></div><div style="background: #f1f5f9; padding: 16px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px; color: #94a3b8;">Juhuri Heritage - jun-juhuri.com</div></div>`,
    },
    {
      slug: 'recording-approved',
      name: 'הקלטה אושרה',
      subject: 'ההקלטה שלך אושרה!',
      to_type: 'user',
      html: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 24px; border-radius: 12px 12px 0 0;"><h2 style="color: #22c55e; margin: 0;">ההקלטה שלך אושרה!</h2></div><div style="background: #fff; padding: 32px; border: 1px solid #e2e8f0;"><p style="color: #1e293b;">שלום {{userName}},</p><p style="color: #475569;">ההקלטה שהגשת עבור המילה <strong>{{term}}</strong> אושרה ופורסמה באתר.</p><p style="color: #475569;">תודה על התרומה לשימור ההגייה!</p><div style="text-align: center; margin: 24px 0;"><a href="https://jun-juhuri.com/he/word/{{term}}" style="background: #22c55e; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">צפייה במילה</a></div></div><div style="background: #f1f5f9; padding: 16px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px; color: #94a3b8;">Juhuri Heritage - jun-juhuri.com</div></div>`,
    },
    {
      slug: 'recording-rejected',
      name: 'הקלטה נדחתה',
      subject: 'עדכון לגבי ההקלטה שלך',
      to_type: 'user',
      html: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 24px; border-radius: 12px 12px 0 0;"><h2 style="color: #fbbf24; margin: 0;">עדכון לגבי ההקלטה שלך</h2></div><div style="background: #fff; padding: 32px; border: 1px solid #e2e8f0;"><p style="color: #1e293b;">שלום {{userName}},</p><p style="color: #475569;">ההקלטה שהגשת עבור המילה <strong>{{term}}</strong> לא אושרה לפרסום.</p><p style="color: #475569;">ניתן לנסות להקליט שוב. וודאו שההקלטה ברורה וללא רעשי רקע.</p><div style="text-align: center; margin: 24px 0;"><a href="https://jun-juhuri.com/he/word/{{term}}" style="background: #fbbf24; color: #1e293b; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">נסה שוב</a></div></div><div style="background: #f1f5f9; padding: 16px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px; color: #94a3b8;">Juhuri Heritage - jun-juhuri.com</div></div>`,
    },
    {
      slug: 'role-changed',
      name: 'שינוי תפקיד',
      subject: 'התפקיד שלך באתר עודכן',
      to_type: 'user',
      html: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 24px; border-radius: 12px 12px 0 0;"><h2 style="color: #fbbf24; margin: 0;">התפקיד שלך עודכן</h2></div><div style="background: #fff; padding: 32px; border: 1px solid #e2e8f0;"><p style="color: #1e293b;">שלום {{userName}},</p><p style="color: #475569;">התפקיד שלך באתר מורשת ג׳והורי עודכן ל: <strong>{{roleName}}</strong></p><p style="color: #475569;">אם יש לך שאלות, ניתן ליצור קשר דרך האתר.</p><div style="text-align: center; margin: 24px 0;"><a href="https://jun-juhuri.com/he" style="background: #fbbf24; color: #1e293b; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">לאתר</a></div></div><div style="background: #f1f5f9; padding: 16px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px; color: #94a3b8;">Juhuri Heritage - jun-juhuri.com</div></div>`,
    },
    {
      slug: 'recipe-rejected',
      name: 'מתכון נדחה',
      subject: 'עדכון לגבי המתכון שלך',
      to_type: 'user',
      html: `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 24px; border-radius: 12px 12px 0 0;"><h2 style="color: #fbbf24; margin: 0;">עדכון לגבי המתכון שלך</h2></div><div style="background: #fff; padding: 32px; border: 1px solid #e2e8f0;"><p style="color: #1e293b;">שלום {{userName}},</p><p style="color: #475569;">המתכון <strong>{{recipeTitle}}</strong> לא אושר לפרסום.</p><p style="color: #475569;">ניתן לשלוח מתכון מעודכן בכל עת.</p><div style="text-align: center; margin: 24px 0;"><a href="https://jun-juhuri.com/he/recipes" style="background: #fbbf24; color: #1e293b; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">לעמוד המתכונים</a></div></div><div style="background: #f1f5f9; padding: 16px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px; color: #94a3b8;">Juhuri Heritage - jun-juhuri.com</div></div>`,
    },
  ];

  for (const t of newTemplates) {
    await db.query(
      `INSERT INTO email_templates (slug, name, subject, html_body, to_type, is_active)
       VALUES (?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE name = VALUES(name), subject = VALUES(subject), html_body = VALUES(html_body)`,
      [t.slug, t.name, t.subject, t.html, t.to_type]
    );
    console.log(`Created/Updated: ${t.slug}`);
  }

  // Verify
  const [all] = await db.query('SELECT id, slug, name, is_active FROM email_templates ORDER BY id');
  console.log('\nAll templates:');
  all.forEach(t => console.log(`  ${t.id}. ${t.slug} - ${t.name} [active=${t.is_active}]`));

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
