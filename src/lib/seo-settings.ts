import pool from './db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MetaTemplate {
  titleTemplate: string;
  description: string;
}

interface SeoSettings {
  metaDefaults: Record<string, MetaTemplate>;
  ogImage: string | null;
  siteLogo: string | null;
  favicon: string | null;
}

// ---------------------------------------------------------------------------
// In-memory cache (5-minute TTL)
// ---------------------------------------------------------------------------

let cachedSettings: SeoSettings | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Default meta templates (fallback when DB has no overrides)
const DEFAULT_META: Record<string, MetaTemplate> = {
  home: {
    titleTemplate: "מורשת ג'והורי | המילון לשימור השפה",
    description: "מילון ג'והורי-עברי אינטראקטיבי לשימור שפת יהודי ההרים",
  },
  word: {
    titleTemplate: '{term} — תרגום ג\'והורי',
    description: 'הגדרה ותרגום של "{term}" במילון הג\'והורי-עברי',
  },
  recipes: {
    titleTemplate: 'מתכונים קווקזיים מסורתיים',
    description: 'אוסף מתכונים אותנטיים מהמטבח הג\'והורי והקווקזי-יהודי',
  },
  recipe: {
    titleTemplate: '{title}',
    description: 'מתכון מסורתי: {title}',
  },
  marketplace: {
    titleTemplate: 'שוק קהילתי',
    description: 'שוק האוכל הג\'והורי — מצאו בשלנים ומאכלים קווקזיים אותנטיים',
  },
  vendor: {
    titleTemplate: '{name}',
    description: '{name} בשוק הקהילתי',
  },
  tutor: {
    titleTemplate: 'מורה פרטי AI',
    description: 'למד ג\'והורי עם מורה פרטי מבוסס AI',
  },
  family: {
    titleTemplate: 'שורשים — רשת קהילתית',
    description: 'גלה את הקשרים בין משפחות הקהילה הג\'והורית',
  },
};

// ---------------------------------------------------------------------------
// Fetch all SEO settings from DB (with cache)
// ---------------------------------------------------------------------------

export async function getSeoSettings(): Promise<SeoSettings> {
  const now = Date.now();
  if (cachedSettings && now - cacheTimestamp < CACHE_TTL) {
    return cachedSettings;
  }

  try {
    const [rows] = await pool.query(
      `SELECT setting_key, setting_value FROM seo_settings`
    ) as [any[], any];

    let metaDefaults = { ...DEFAULT_META };
    let ogImage: string | null = null;
    let siteLogo: string | null = null;
    let favicon: string | null = null;

    for (const row of rows) {
      try {
        const value = JSON.parse(row.setting_value);
        switch (row.setting_key) {
          case 'meta_defaults':
            metaDefaults = { ...DEFAULT_META, ...value };
            break;
          case 'og_image':
            ogImage = typeof value === 'string' ? value : value?.url || null;
            break;
          case 'site_logo':
            siteLogo = typeof value === 'string' ? value : value?.url || null;
            break;
          case 'favicon':
            favicon = typeof value === 'string' ? value : value?.url || null;
            break;
        }
      } catch {
        // skip unparseable values
      }
    }

    cachedSettings = { metaDefaults, ogImage, siteLogo, favicon };
    cacheTimestamp = now;
    return cachedSettings;
  } catch (error: any) {
    // Table doesn't exist yet — use defaults
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      return { metaDefaults: DEFAULT_META, ogImage: null, siteLogo: null, favicon: null };
    }
    // On error, return defaults rather than crashing
    return { metaDefaults: DEFAULT_META, ogImage: null, siteLogo: null, favicon: null };
  }
}

// ---------------------------------------------------------------------------
// Helper: apply template variables
// ---------------------------------------------------------------------------

export function applyTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Helper: build page metadata from DB settings
// ---------------------------------------------------------------------------

const SITE_URL = process.env.SITE_URL || 'https://jun-juhuri.com';

export async function buildPageMeta(
  pageType: string,
  vars: Record<string, string>,
  overrides?: {
    description?: string;
    ogImage?: string;
    ogType?: 'article' | 'website';
    canonicalPath?: string;
  },
) {
  const settings = await getSeoSettings();
  const template = settings.metaDefaults[pageType] || DEFAULT_META[pageType];

  const title = template
    ? applyTemplate(template.titleTemplate, vars)
    : vars.title || vars.term || vars.name || '';

  const description = overrides?.description
    || (template ? applyTemplate(template.description, vars) : '');

  const ogImageUrl = overrides?.ogImage || settings.ogImage || '/images/og-default.png';
  const canonicalUrl = overrides?.canonicalPath
    ? `${SITE_URL}${overrides.canonicalPath}`
    : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: overrides?.ogType || 'website' as const,
      ...(canonicalUrl && { url: canonicalUrl }),
      images: [{ url: ogImageUrl }],
    },
    ...(canonicalUrl && {
      alternates: { canonical: canonicalUrl },
    }),
  };
}
