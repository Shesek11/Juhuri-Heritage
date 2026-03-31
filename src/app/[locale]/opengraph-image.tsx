import { ImageResponse } from 'next/og';
import { logoBase64, ogFonts, bidi, autoFontSize } from '@/src/lib/og-shared';
import { getSeoSettings } from '@/src/lib/seo-settings';

export const runtime = 'nodejs';
export const contentType = 'image/png';
export const size = { width: 1200, height: 630 };

// Map of locale → page path → display title (Latin + translations)
// For pages that don't have dynamic content, we show the section name
const PAGE_TITLES: Record<string, { latin: string; sub: string }> = {
  '/dictionary': { latin: 'Juhuri Dictionary', sub: 'מילון · Dictionary · Словарь' },
  '/recipes': { latin: 'Juhuri Recipes', sub: 'מתכונים · Recipes · Рецепты' },
  '/marketplace': { latin: 'Community Market', sub: 'שוק קהילתי · Market · Рынок' },
  '/tutor': { latin: 'AI Language Tutor', sub: 'מורה פרטי · Tutor · Репетитор' },
  '/family': { latin: 'Family Roots', sub: 'שורשים · Roots · Корни' },
  '/about': { latin: 'About Juhuri Heritage', sub: 'אודות · About · О нас' },
  '/contact': { latin: 'Contact Us', sub: 'צור קשר · Contact · Контакт' },
  '/music': { latin: 'Juhuri Music', sub: 'מוזיקה · Music · Музыка' },
};

// Locale-aware homepage content
const LOCALE_HOME: Record<string, { title: string; subtitle: string; tagline: string }> = {
  he: {
    title: bidi("מורשת ג'והורי"),
    subtitle: 'Juhuri Heritage  ·  Наследие Джуури',
    tagline: bidi('שימור השפה של יהודי ההרים'),
  },
  ru: {
    title: 'Наследие Джуури',
    subtitle: bidi("מורשת ג'והורי") + '  ·  Juhuri Heritage',
    tagline: 'Сохранение языка горских евреев',
  },
  en: {
    title: 'Juhuri Heritage',
    subtitle: bidi("מורשת ג'והורי") + '  ·  Наследие Джуури',
    tagline: 'Preserving the language of the Mountain Jews',
  },
};

export default async function OgImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  // Check if admin uploaded a custom OG image
  const settings = await getSeoSettings();
  if (settings.ogImage) {
    // Admin has a custom image — let Next.js use the meta tag instead
    // Return a branded fallback anyway (the meta tag takes priority)
  }

  const { locale } = await params;

  // Locale-aware homepage
  const home = LOCALE_HOME[locale] || LOCALE_HOME.en;
  const title = home.title;
  const subtitle = home.subtitle;
  const tagline = home.tagline;
  const mainFontSize = autoFontSize(title);

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
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
        <div style={{ position: 'absolute', top: 16, left: 16, right: 16, bottom: 16, border: '1px solid rgba(217,119,6,0.15)', borderRadius: 12, display: 'flex' }} />

        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoBase64} width={80} height={80} alt="" style={{ marginBottom: 24, opacity: 0.9 }} />

        {/* Title */}
        <div style={{ fontSize: mainFontSize, fontWeight: 700, color: '#fff', letterSpacing: '-1px', lineHeight: 1.2, textAlign: 'center', maxWidth: 1000 }}>
          {title}
        </div>

        {/* Subtitle */}
        <div style={{ display: 'flex', marginTop: 20, fontSize: 24, color: '#d97706', textAlign: 'center' }}>
          {subtitle}
        </div>

        {/* Tagline */}
        <div style={{ display: 'flex', marginTop: 16, fontSize: 18, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
          {tagline}
        </div>

        {/* Footer */}
        <div style={{ position: 'absolute', bottom: 36, display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, color: 'rgba(255,255,255,0.4)' }}>
          <span>jun-juhuri.com</span>
        </div>
      </div>
    ),
    { ...size, fonts: ogFonts },
  );
}
