/**
 * JSON-LD structured data builders for SEO.
 * Used in page components via generateMetadata or direct rendering.
 *
 * Note: The JsonLd component uses dangerouslySetInnerHTML which is safe here
 * because the data is server-generated structured data (not user input).
 * This is the standard Next.js pattern for JSON-LD injection.
 */

const SITE_URL = process.env.SITE_URL || 'https://jun-juhuri.com';
const SITE_NAME = "מורשת ג'והורי";

export function buildWebsiteJsonLd() {
  return {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description: "מילון ג'והורי-עברי אינטראקטיבי לשימור שפת יהודי ההרים",
    inLanguage: 'he',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/dictionary?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildOrganizationJsonLd(logoPath?: string | null) {
  return {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: logoPath ? `${SITE_URL}${logoPath}` : `${SITE_URL}/images/logo.png`,
    sameAs: [],
  };
}

export function buildBreadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildDefinedTermJsonLd(entry: {
  slug?: string | null;
  hebrewScript: string;
  hebrewShort?: string;
  russianShort?: string;
  englishShort?: string;
  partOfSpeech?: string;
  pronunciationGuide?: string;
}) {
  const meanings = [entry.hebrewShort, entry.russianShort, entry.englishShort].filter(Boolean).join(' | ');
  return {
    '@type': 'DefinedTerm',
    '@id': `${SITE_URL}/word/${entry.slug || encodeURIComponent(entry.hebrewScript)}`,
    name: entry.hebrewScript,
    description: meanings || entry.hebrewScript,
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      '@id': `${SITE_URL}/#dictionary`,
      name: "מילון ג'והורי-עברי",
    },
    ...(entry.pronunciationGuide && {
      pronunciation: entry.pronunciationGuide,
    }),
  };
}

export function buildRecipeJsonLd(recipe: {
  title: string;
  description?: string;
  ingredients?: any[];
  instructions?: any[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  photoUrl?: string;
  id: number;
}) {
  return {
    '@type': 'Recipe',
    '@id': `${SITE_URL}/recipes/${recipe.id}`,
    name: recipe.title,
    description: recipe.description || recipe.title,
    ...(recipe.photoUrl && { image: recipe.photoUrl }),
    ...(recipe.ingredients && {
      recipeIngredient: recipe.ingredients.map((i: any) =>
        typeof i === 'string' ? i : `${i.amount || ''} ${i.unit || ''} ${i.name || ''}`.trim()
      ),
    }),
    ...(recipe.instructions && {
      recipeInstructions: recipe.instructions.map((step: any, idx: number) => ({
        '@type': 'HowToStep',
        position: idx + 1,
        text: typeof step === 'string' ? step : step.text || step.step || '',
      })),
    }),
    ...(recipe.prepTime && { prepTime: `PT${recipe.prepTime}M` }),
    ...(recipe.cookTime && { cookTime: `PT${recipe.cookTime}M` }),
    ...(recipe.servings && { recipeYield: `${recipe.servings}` }),
    recipeCuisine: "ג'והורית",
  };
}

export function buildLocalBusinessJsonLd(vendor: {
  name: string;
  slug: string;
  aboutText?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  logoUrl?: string;
  averageRating?: number;
  totalReviews?: number;
}) {
  return {
    '@type': 'LocalBusiness',
    '@id': `${SITE_URL}/marketplace/${vendor.slug}`,
    name: vendor.name,
    description: vendor.aboutText || vendor.name,
    ...(vendor.logoUrl && { image: vendor.logoUrl }),
    ...(vendor.address && {
      address: {
        '@type': 'PostalAddress',
        streetAddress: vendor.address,
        ...(vendor.city && { addressLocality: vendor.city }),
        addressCountry: 'IL',
      },
    }),
    ...(vendor.latitude && vendor.longitude && {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: vendor.latitude,
        longitude: vendor.longitude,
      },
    }),
    ...(vendor.phone && { telephone: vendor.phone }),
    ...(vendor.email && { email: vendor.email }),
    ...(vendor.website && { url: vendor.website }),
    ...(vendor.averageRating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: vendor.averageRating,
        reviewCount: vendor.totalReviews || 0,
      },
    }),
  };
}

/**
 * Build the full JSON-LD @graph for a page.
 * Note: WebSite + Organization are already injected by the locale layout,
 * so page-level JSON-LD only includes page-specific items.
 */
export function buildJsonLdGraph(...items: object[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': items,
  };
}
