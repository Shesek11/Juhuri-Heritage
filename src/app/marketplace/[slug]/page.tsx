import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import pool from '@/src/lib/db';
import {
  buildJsonLdGraph,
  buildLocalBusinessJsonLd,
  buildBreadcrumbJsonLd,
} from '@/src/lib/jsonld';
import VendorMapWrapper from './VendorMapWrapper';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.SITE_URL || 'https://jun-juhuri.com';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VendorRow {
  id: number;
  name: string;
  slug: string;
  about_text: string | null;
  about_image_url: string | null;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  business_hours: string | null;
  is_verified: number | null;
  owner_name: string | null;
  average_rating: number | null;
  total_reviews: number | null;
  created_at: string | null;
}

type Props = { params: Promise<{ slug: string }> };

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const [rows] = await pool.query<VendorRow[] & any>(
    `SELECT v.*, s.average_rating, s.total_reviews
     FROM marketplace_vendors v
     LEFT JOIN marketplace_vendor_stats s ON v.id = s.vendor_id
     WHERE v.slug = ? AND v.status = 'active'
     LIMIT 1`,
    [slug],
  );
  const vendor = (rows as VendorRow[])[0];
  if (!vendor) return { title: 'עסק לא נמצא' };

  const description =
    vendor.about_text || `${vendor.name} — עסק ג'והורי בשוק הקהילתי`;

  return {
    title: vendor.name,
    description,
    openGraph: {
      title: vendor.name,
      description,
      type: 'website',
      url: `${SITE_URL}/marketplace/${vendor.slug}`,
      ...(vendor.logo_url && {
        images: [{ url: vendor.logo_url, alt: vendor.name }],
      }),
    },
    alternates: {
      canonical: `${SITE_URL}/marketplace/${vendor.slug}`,
    },
  };
}

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

export default async function VendorPage({ params }: Props) {
  const { slug } = await params;

  const [rows] = await pool.query<VendorRow[] & any>(
    `SELECT v.*, s.average_rating, s.total_reviews
     FROM marketplace_vendors v
     LEFT JOIN marketplace_vendor_stats s ON v.id = s.vendor_id
     WHERE v.slug = ? AND v.status = 'active'
     LIMIT 1`,
    [slug],
  );
  const vendor = (rows as VendorRow[])[0];
  if (!vendor) notFound();

  const businessHours: { day: string; open: string; close: string }[] = safeJsonParse(
    vendor.business_hours,
    [],
  );

  // JSON-LD
  const jsonLd = buildJsonLdGraph(
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
      { name: 'דף הבית', url: SITE_URL },
      { name: 'שוק קהילתי', url: `${SITE_URL}/marketplace` },
      { name: vendor.name, url: `${SITE_URL}/marketplace/${vendor.slug}` },
    ]),
  );

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <JsonLdScript data={jsonLd} />

      {/* Breadcrumb */}
      <nav className="max-w-4xl mx-auto px-4 pt-6 text-sm text-slate-500 dark:text-slate-400">
        <ol className="flex items-center gap-2">
          <li>
            <a href="/" className="hover:text-amber-600 transition-colors">
              דף הבית
            </a>
          </li>
          <li>/</li>
          <li>
            <a href="/marketplace" className="hover:text-amber-600 transition-colors">
              שוק קהילתי
            </a>
          </li>
          <li>/</li>
          <li className="text-slate-800 dark:text-slate-200 font-medium">{vendor.name}</li>
        </ol>
      </nav>

      <article className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero */}
        <header className="mb-8">
          {(vendor.about_image_url || vendor.logo_url) && (
            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-6">
              <img
                src={vendor.about_image_url || vendor.logo_url!}
                alt={vendor.name}
                className="w-full h-full object-cover"
              />
              {!!vendor.is_verified && (
                <span className="absolute top-4 left-4 px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                  <CheckIcon /> מאומת
                </span>
              )}
            </div>
          )}

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                {vendor.name}
              </h1>
              {vendor.address && (
                <p className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <MapPinIcon />
                  {vendor.address}
                  {vendor.city && `, ${vendor.city}`}
                </p>
              )}
            </div>

            {vendor.average_rating && vendor.average_rating > 0 && (
              <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 px-3 py-2 rounded-lg text-amber-600 dark:text-amber-400 font-bold">
                <StarIcon />
                {Number(vendor.average_rating).toFixed(1)}
                {vendor.total_reviews && (
                  <span className="text-xs font-normal text-slate-400 mr-1">
                    ({vendor.total_reviews})
                  </span>
                )}
              </div>
            )}
          </div>
        </header>

        {/* About */}
        {vendor.about_text && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-3">
              אודות
            </h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {vendor.about_text}
            </p>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">
              פרטי קשר
            </h2>
            <div className="space-y-3 text-slate-700 dark:text-slate-300">
              {vendor.phone && (
                <p className="flex items-center gap-2">
                  <PhoneIcon />
                  <a href={`tel:${vendor.phone}`} className="hover:text-amber-600" dir="ltr">
                    {vendor.phone}
                  </a>
                </p>
              )}
              {vendor.email && (
                <p className="flex items-center gap-2">
                  <MailIcon />
                  <a href={`mailto:${vendor.email}`} className="hover:text-amber-600" dir="ltr">
                    {vendor.email}
                  </a>
                </p>
              )}
              {vendor.website && (
                <p className="flex items-center gap-2">
                  <GlobeIcon />
                  <a
                    href={vendor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-amber-600"
                    dir="ltr"
                  >
                    {vendor.website.replace(/^https?:\/\//, '')}
                  </a>
                </p>
              )}
            </div>
          </section>

          {/* Business hours */}
          {businessHours.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">
                שעות פעילות
              </h2>
              <div className="space-y-2">
                {businessHours.map((h, i) => (
                  <div
                    key={i}
                    className="flex justify-between text-sm text-slate-700 dark:text-slate-300"
                  >
                    <span className="font-medium">{h.day}</span>
                    <span dir="ltr">
                      {h.open} - {h.close}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Map */}
        {vendor.latitude && vendor.longitude && (
          <section className="mt-8">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">
              מיקום
            </h2>
            <div className="rounded-xl overflow-hidden h-64 border border-slate-200 dark:border-slate-700">
              <VendorMapWrapper
                latitude={vendor.latitude}
                longitude={vendor.longitude}
                name={vendor.name}
              />
            </div>
          </section>
        )}

        {/* Owner */}
        {vendor.owner_name && (
          <footer className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
            <p>בעלים: {vendor.owner_name}</p>
          </footer>
        )}
      </article>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Inline SVG icons
// ---------------------------------------------------------------------------

function CheckIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx={12} cy={10} r={3} />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <path d="M22 6l-10 7L2 6" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <circle cx={12} cy={12} r={10} />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
