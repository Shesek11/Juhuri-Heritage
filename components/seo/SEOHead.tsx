import { Helmet } from 'react-helmet-async';

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://juhuri.shesek.xyz';
const SITE_NAME = 'מורשת ג\'והורי';
const DEFAULT_IMAGE = `${SITE_URL}/images/og-default.png`;

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: string;
  jsonLd?: object | object[];
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description = 'מילון ג\'והורי-עברי אינטראקטיבי לשימור שפת יהודי ההרים (ג\'והורית). חפש מילים, למד את השפה ותרום לשימור המורשת.',
  canonicalPath,
  ogImage = DEFAULT_IMAGE,
  ogType = 'website',
  jsonLd,
}) => {
  const fullTitle = title
    ? `${title} | ${SITE_NAME}`
    : `${SITE_NAME} | המילון לשימור השפה`;

  // Always resolve canonical: explicit path > current window path
  const resolvedPath = canonicalPath ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
  const canonicalUrl = `${SITE_URL}${resolvedPath}`;

  const jsonLdArray = jsonLd
    ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd])
    : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="he_IL" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD Structured Data */}
      {jsonLdArray.map((ld, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(ld)}
        </script>
      ))}
    </Helmet>
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
  'logo': `${SITE_URL}/images/og-default.png`,
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
  instructions?: { step_number: number; instruction: string }[];
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
      'text': step.instruction,
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
