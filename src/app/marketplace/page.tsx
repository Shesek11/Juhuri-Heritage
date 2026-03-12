import type { Metadata } from 'next';
import Link from 'next/link';
import pool from '@/src/lib/db';
import { buildJsonLdGraph, buildBreadcrumbJsonLd } from '@/src/lib/jsonld';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.SITE_URL || 'https://jun-juhuri.com';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VendorListRow {
  id: number;
  name: string;
  slug: string;
  about_text: string | null;
  logo_url: string | null;
  about_image_url: string | null;
  address: string | null;
  city: string | null;
  is_verified: number | null;
  average_rating: number | null;
  total_reviews: number | null;
  owner_name: string | null;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'שוק קהילתי',
  description:
    "שוק קהילתי ג'והורי — עסקים, מסעדות ושירותים של הקהילה הג'והורית. מצאו עסקים מקומיים ותמכו בקהילה.",
  openGraph: {
    title: "שוק קהילתי ג'והורי",
    description: "עסקים ושירותים של הקהילה הג'והורית",
    type: 'website',
    url: `${SITE_URL}/marketplace`,
  },
  alternates: {
    canonical: `${SITE_URL}/marketplace`,
  },
};

// ---------------------------------------------------------------------------
// JSON-LD component — safe: server-generated structured data, not user input
// ---------------------------------------------------------------------------
function JsonLdScript({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function MarketplacePage() {
  const [rows] = await pool.query<VendorListRow[] & any>(
    `SELECT v.*, s.average_rating, s.total_reviews
     FROM marketplace_vendors v
     LEFT JOIN marketplace_vendor_stats s ON v.id = s.vendor_id
     WHERE v.status = 'active'
     ORDER BY v.name`,
  );
  const vendors = rows as VendorListRow[];

  const jsonLd = buildJsonLdGraph(
    buildBreadcrumbJsonLd([
      { name: 'דף הבית', url: SITE_URL },
      { name: 'שוק קהילתי', url: `${SITE_URL}/marketplace` },
    ]),
  );

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <JsonLdScript data={jsonLd} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            שוק קהילתי
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {"עסקים ושירותים של הקהילה הג'והורית"}
          </p>
        </header>

        {/* Vendor grid */}
        {vendors.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-slate-400 py-16">
            אין עסקים עדיין
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors.map((vendor) => (
              <Link
                key={vendor.id}
                href={`/marketplace/${vendor.slug}`}
                className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-200 dark:border-slate-700 hover:-translate-y-1"
              >
                {/* Image */}
                <div className="h-40 overflow-hidden bg-slate-200 dark:bg-slate-700 relative">
                  {vendor.logo_url || vendor.about_image_url ? (
                    <img
                      src={vendor.logo_url || vendor.about_image_url!}
                      alt={vendor.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-4xl">
                      &#x1F3EA;
                    </div>
                  )}

                  <div className="absolute top-2 right-2 flex gap-2">
                    {!!vendor.is_verified && (
                      <span className="px-2 py-1 rounded-lg text-xs font-bold bg-blue-500 text-white flex items-center gap-1">
                        <CheckIcon /> מאומת
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h2 className="font-bold text-lg text-slate-900 dark:text-slate-100 leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {vendor.name}
                      </h2>
                      {vendor.address && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {vendor.address}
                          {vendor.city && `, ${vendor.city}`}
                        </p>
                      )}
                    </div>
                    {vendor.average_rating && Number(vendor.average_rating) > 0 && (
                      <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded text-amber-600 dark:text-amber-400 text-xs font-bold">
                        <StarIcon />
                        {Number(vendor.average_rating).toFixed(1)}
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-3 min-h-[2.5rem]">
                    {vendor.about_text || "אוכל עדתי מסורתי"}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                    {vendor.owner_name ? (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {vendor.owner_name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        דיווח קהילתי
                      </span>
                    )}
                    {vendor.total_reviews != null && vendor.total_reviews > 0 && (
                      <span className="text-xs text-slate-500">
                        {vendor.total_reviews} ביקורות
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Inline icons
// ---------------------------------------------------------------------------

function CheckIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
