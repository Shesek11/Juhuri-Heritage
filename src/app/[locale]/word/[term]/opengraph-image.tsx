import { ImageResponse } from 'next/og';
import pool from '@/src/lib/db';
import { logoBase64, ogFonts, bidi, truncate, autoFontSize } from '@/src/lib/og-shared';

export const runtime = 'nodejs';
export const contentType = 'image/png';
export const size = { width: 1200, height: 630 };

export default async function OgImage({
  params,
}: {
  params: Promise<{ term: string }>;
}) {
  const { term } = await params;
  const decoded = decodeURIComponent(term);

  // Fetch word data (support slug, numeric ID, or hebrew_script)
  const isId = /^\d+$/.test(decoded);
  const isLatin = /^[a-z0-9\u00c0-\u024f\-]+$/i.test(decoded);

  let where: string;
  let qp: any[];
  if (isId) {
    where = '(e.id = ? OR e.hebrew_script = ? OR e.slug = ?)';
    qp = [decoded, decoded, decoded];
  } else if (isLatin) {
    where = '(e.slug = ? OR e.hebrew_script = ?)';
    qp = [decoded, decoded];
  } else {
    where = 'e.hebrew_script = ?';
    qp = [decoded];
  }

  const [rows] = await pool.query(
    `SELECT e.hebrew_script, e.hebrew_short, e.russian_short, e.english_short,
            ds.pronunciation_guide, ds.latin_script
     FROM dictionary_entries e
     LEFT JOIN dialect_scripts ds ON e.id = ds.entry_id
     WHERE ${where}
     LIMIT 1`,
    qp,
  ) as any[];

  const entry = rows[0];
  const latin = truncate(entry?.latin_script || entry?.pronunciation_guide || decoded, 35);
  const hebrew = truncate(entry?.hebrew_short || '', 30);
  const english = truncate(entry?.english_short || '', 35);
  const russian = truncate(entry?.russian_short || '', 35);
  const mainFontSize = autoFontSize(latin);

  const translations = [
    hebrew && { text: bidi(hebrew), isHebrew: true },
    english && { text: english, isHebrew: false },
    russian && { text: russian, isHebrew: false },
  ].filter(Boolean) as { text: string; isHebrew: boolean }[];

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #050B14 0%, #0a1628 50%, #050B14 100%)',
          fontFamily: 'Rubik',
          position: 'relative',
          overflow: 'hidden',
          padding: '0 60px',
        }}
      >
        {/* Border */}
        <div style={{ position: 'absolute', top: 16, left: 16, right: 16, bottom: 16, border: '1px solid rgba(217,119,6,0.15)', borderRadius: '12px', display: 'flex' }} />

        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoBase64} width={64} height={64} alt="" style={{ marginBottom: 20, opacity: 0.9 }} />

        {/* Latin transliteration */}
        <div style={{ fontSize: mainFontSize, fontWeight: 700, color: '#fff', letterSpacing: '-1px', lineHeight: 1.2, textAlign: 'center', maxWidth: 1000 }}>
          {latin}
        </div>

        {/* Dot divider */}
        {translations.length > 0 && (
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d97706', margin: '16px 0', display: 'flex' }} />
        )}

        {/* Translations */}
        {translations.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 28, color: '#d97706', maxWidth: 1000, textAlign: 'center' }}>
            {translations.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {i > 0 && <span style={{ color: 'rgba(217,119,6,0.4)', fontSize: 14 }}>|</span>}
                <span style={t.isHebrew ? { direction: 'rtl', unicodeBidi: 'bidi-override' } : {}}>
                  {t.text}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ position: 'absolute', bottom: 36, display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, color: 'rgba(255,255,255,0.4)' }}>
          <span style={{ direction: 'rtl', unicodeBidi: 'bidi-override' }}>{bidi("מורשת ג'והורי")}</span>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
          <span>jun-juhuri.com</span>
        </div>
      </div>
    ),
    { ...size, fonts: ogFonts },
  );
}
