import type { Metadata } from 'next';
import pool from '@/src/lib/db';
import { buildPageMeta } from '@/src/lib/seo-settings';
import {
  buildJsonLdGraph,
  buildLocalBusinessJsonLd,
  buildBreadcrumbJsonLd,
} from '@/src/lib/jsonld';
import MarketplaceWrapper from '../MarketplaceWrapper';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.SITE_URL || 'https://jun-juhuri.com';

interface VendorRow {
  id: number;
  name: string;
  slug: string;
  about_text: string | null;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  average_rating: number | null;
  total_reviews: number | null;
}

type Props = { params: Promise<{ locale: string; slug: string }> };

// Server-side metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;

  const [rows] = await pool.query<VendorRow[] & any>(
    `SELECT v.*, s.average_rating, s.total_reviews
     FROM marketplace_vendors v
     LEFT JOIN marketplace_vendor_stats s ON v.id = s.vendor_id
     WHERE v.slug = ? AND v.status = 'active'
     LIMIT 1`,
    [slug],
  );
  const vendor = (rows as VendorRow[])[0];
  if (!vendor) return { title: '\u05E2\u05E1\u05E7 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0' };

  return buildPageMeta('vendor', { name: vendor.name }, {
    description: vendor.about_text || undefined,
    ogImage: vendor.logo_url || undefined,
    canonicalPath: `/marketplace/${vendor.slug}`,
    locale,
  });
}

/**
 * JSON-LD component.
 * Safe: data is server-generated structured data from our own builders
 * (not user input). Standard Next.js JSON-LD pattern.
 */
function JsonLdScript({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default async function VendorPage({ params }: Props) {
  const { slug } = await params;

  // Fetch vendor for JSON-LD
  const [rows] = await pool.query<VendorRow[] & any>(
    `SELECT v.*, s.average_rating, s.total_reviews
     FROM marketplace_vendors v
     LEFT JOIN marketplace_vendor_stats s ON v.id = s.vendor_id
     WHERE v.slug = ? AND v.status = 'active'
     LIMIT 1`,
    [slug],
  );
  const vendor = (rows as VendorRow[])[0];

  const jsonLd = vendor
    ? buildJsonLdGraph(
        buildLocalBusinessJsonLd({
          name: vendor.name,
          slug: vendor.slug,
          aboutText: vendor.about_text || undefined,
          address: vendor.address || undefined,
          city: vendor.city || undefined,
          phone: vendor.phone || undefined,
          email: vendor.email || undefined,
          website: vendor.website || undefined,
          latitude: vendor.latitude || undefined,
          longitude: vendor.longitude || undefined,
          logoUrl: vendor.logo_url || undefined,
          averageRating: vendor.average_rating || undefined,
          totalReviews: vendor.total_reviews || undefined,
        }),
        buildBreadcrumbJsonLd([
          { name: '\u05D3\u05E3 \u05D4\u05D1\u05D9\u05EA', url: SITE_URL },
          { name: '\u05E9\u05D5\u05E7 \u05E7\u05D4\u05D9\u05DC\u05EA\u05D9', url: `${SITE_URL}/marketplace` },
          { name: vendor.name, url: `${SITE_URL}/marketplace/${vendor.slug}` },
        ]),
      )
    : null;

  return (
    <>
      {jsonLd && <JsonLdScript data={jsonLd} />}
      <MarketplaceWrapper />
    </>
  );
}
