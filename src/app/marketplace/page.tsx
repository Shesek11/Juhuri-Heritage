import type { Metadata } from 'next';
import MarketplaceWrapper from './MarketplaceWrapper';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.SITE_URL || 'https://jun-juhuri.com';

export const metadata: Metadata = {
  title: '\u05E9\u05D5\u05E7 \u05E7\u05D4\u05D9\u05DC\u05EA\u05D9',
  description:
    "\u05E9\u05D5\u05E7 \u05E7\u05D4\u05D9\u05DC\u05EA\u05D9 \u05D2'\u05D5\u05D4\u05D5\u05E8\u05D9 \u2014 \u05E2\u05E1\u05E7\u05D9\u05DD, \u05DE\u05E1\u05E2\u05D3\u05D5\u05EA \u05D5\u05E9\u05D9\u05E8\u05D5\u05EA\u05D9\u05DD \u05E9\u05DC \u05D4\u05E7\u05D4\u05D9\u05DC\u05D4 \u05D4\u05D2'\u05D5\u05D4\u05D5\u05E8\u05D9\u05EA. \u05DE\u05E6\u05D0\u05D5 \u05E2\u05E1\u05E7\u05D9\u05DD \u05DE\u05E7\u05D5\u05DE\u05D9\u05D9\u05DD \u05D5\u05EA\u05DE\u05DB\u05D5 \u05D1\u05E7\u05D4\u05D9\u05DC\u05D4.",
  openGraph: {
    title: "\u05E9\u05D5\u05E7 \u05E7\u05D4\u05D9\u05DC\u05EA\u05D9 \u05D2'\u05D5\u05D4\u05D5\u05E8\u05D9",
    description: "\u05E2\u05E1\u05E7\u05D9\u05DD \u05D5\u05E9\u05D9\u05E8\u05D5\u05EA\u05D9\u05DD \u05E9\u05DC \u05D4\u05E7\u05D4\u05D9\u05DC\u05D4 \u05D4\u05D2'\u05D5\u05D4\u05D5\u05E8\u05D9\u05EA",
    type: 'website',
    url: `${SITE_URL}/marketplace`,
  },
  alternates: {
    canonical: `${SITE_URL}/marketplace`,
  },
};

export default function MarketplaceListPage() {
  return <MarketplaceWrapper />;
}
