'use client';

/**
 * SEOHead — Next.js compatible version.
 *
 * In Next.js, metadata (title, description, OG, canonical) is handled by
 * `generateMetadata()` or `export const metadata` in page files.
 * This component only renders JSON-LD structured data scripts.
 *
 * Security note: JSON-LD data is constructed from our own builder functions
 * using server-side DB data (not user input). This is the standard Next.js
 * pattern for structured data injection and is safe from XSS.
 */

const SITE_URL = typeof window !== 'undefined'
  ? window.location.origin
  : 'https://jun-juhuri.com';
const SITE_NAME = 'מורשת ג\'והורי';

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: string;
  jsonLd?: object | object[];
}

export const SEOHead: React.FC<SEOHeadProps> = ({ jsonLd }) => {
  // In Next.js, metadata is handled by generateMetadata/metadata exports.
  // This component only renders JSON-LD structured data.
  if (!jsonLd) return null;

  const jsonLdArray = Array.isArray(jsonLd) ? jsonLd : [jsonLd];

  // Safe: JSON-LD data is server-generated structured data from our own
  // builders (not user input). This is the standard Next.js JSON-LD pattern.
  return (
    <>
      {jsonLdArray.map((ld, i) => (
        <script
          key={i}
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger -- safe: server-generated structured data
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      ))}
    </>
  );
};

// Pre-built JSON-LD schemas
export const WEBSITE_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  'name': SITE_NAME,
  'alternateName': 'Juhuri Heritage',
  'url': SITE_URL,
  'description': 'מילון ג\'והורי-עברי אינטראקטיבי לשימור שפת יהודי ההרים',
  'inLanguage': ['he', 'jdt'],
  'potentialAction': {
    '@type': 'SearchAction',
    'target': `${SITE_URL}/word/{search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

export const ORGANIZATION_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  'name': 'Juhuri Heritage',
  'alternateName': 'מורשת ג\'והורי',
  'url': SITE_URL,
  'logo': `${SITE_URL}/images/logo-transparent.png`,
  'description': 'שימור שפת ג\'והורי, מתכונים ומורשת תרבותית של יהודי ההרים',
};

export function buildDefinedTermJsonLd(term: string, definition: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    'name': term,
    'description': definition,
    'inDefinedTermSet': {
      '@type': 'DefinedTermSet',
      'name': 'מילון ג\'והורי-עברי',
    },
  };
}

export function buildRecipeJsonLd(recipe: {
  title: string;
  description?: string;
  main_photo?: string;
  author_name?: string;
  prep_time?: number;
  cook_time?: number;
  servings?: number;
  ingredients?: string[];
  instructions?: (string | { step_number: number; instruction: string })[];
  avg_rating?: number;
  review_count?: number;
  tags?: string[];
}) {
  const ld: any = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    'name': recipe.title,
    'description': recipe.description || recipe.title,
    'recipeCuisine': 'Caucasian Jewish',
  };

  if (recipe.main_photo) ld.image = recipe.main_photo;
  if (recipe.author_name) ld.author = { '@type': 'Person', 'name': recipe.author_name };
  if (recipe.prep_time) ld.prepTime = `PT${recipe.prep_time}M`;
  if (recipe.cook_time) ld.cookTime = `PT${recipe.cook_time}M`;
  if (recipe.prep_time && recipe.cook_time) ld.totalTime = `PT${recipe.prep_time + recipe.cook_time}M`;
  if (recipe.servings) ld.recipeYield = `${recipe.servings}`;
  if (recipe.tags) ld.recipeCategory = recipe.tags;

  if (recipe.ingredients && recipe.ingredients.length > 0) {
    ld.recipeIngredient = recipe.ingredients;
  }

  if (recipe.instructions && recipe.instructions.length > 0) {
    ld.recipeInstructions = recipe.instructions.map(step => ({
      '@type': 'HowToStep',
      'text': typeof step === 'string' ? step : step.instruction,
    }));
  }

  if (recipe.avg_rating && recipe.review_count) {
    ld.aggregateRating = {
      '@type': 'AggregateRating',
      'ratingValue': recipe.avg_rating,
      'ratingCount': recipe.review_count,
    };
  }

  return ld;
}

export function buildLocalBusinessJsonLd(vendor: {
  name: string;
  about_text?: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  website?: string;
  avg_rating?: number;
  review_count?: number;
}) {
  const ld: any = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    'name': vendor.name,
  };

  if (vendor.about_text) ld.description = vendor.about_text;
  if (vendor.address || vendor.city) {
    ld.address = {
      '@type': 'PostalAddress',
      ...(vendor.address && { streetAddress: vendor.address }),
      ...(vendor.city && { addressLocality: vendor.city }),
    };
  }
  if (vendor.latitude && vendor.longitude) {
    ld.geo = {
      '@type': 'GeoCoordinates',
      'latitude': vendor.latitude,
      'longitude': vendor.longitude,
    };
  }
  if (vendor.phone) ld.telephone = vendor.phone;
  if (vendor.website) ld.url = vendor.website;
  if (vendor.avg_rating && vendor.review_count) {
    ld.aggregateRating = {
      '@type': 'AggregateRating',
      'ratingValue': vendor.avg_rating,
      'reviewCount': vendor.review_count,
    };
  }

  return ld;
}
