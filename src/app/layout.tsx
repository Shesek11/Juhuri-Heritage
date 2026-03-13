import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import AppProviders from '../../components/providers/AppProviders';

const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID || '';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'https://jun-juhuri.com'),
  title: {
    default: "מורשת ג'והורי | המילון לשימור השפה",
    template: "%s | מורשת ג'והורי",
  },
  description:
    "מילון ג'והורי-עברי אינטראקטיבי לשימור שפת יהודי ההרים (ג'והורית). חפש מילים, למד את השפה ותרום לשימור המורשת.",
  keywords: ["ג'והורי", 'Juhuri', 'יהודי ההרים', 'מילון', 'שפה', 'מורשת', 'קווקז'],
  alternates: { canonical: '/' },
  openGraph: {
    title: "מורשת ג'והורי - המילון לשימור השפה",
    description: "מילון ג'והורי-עברי אינטראקטיבי עם מורה פרטי AI",
    type: 'website',
    locale: 'he_IL',
    siteName: "מורשת ג'והורי",
    images: [
      {
        url: '/images/og-default.png',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "מורשת ג'והורי - המילון לשימור השפה",
    description: "מילון ג'והורי-עברי אינטראקטיבי לשימור שפת יהודי ההרים",
    images: ['/images/og-default.png'],
  },
  verification: {
    google: 'A3yUQjWHTO2y6V4kjV3k61E43gkDr4yxavoZfyxKc4U',
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📜</text></svg>",
  },
};

const SITE_URL = process.env.SITE_URL || 'https://jun-juhuri.com';

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "מורשת ג'והורי",
      description: "מילון ג'והורי-עברי אינטראקטיבי לשימור שפת יהודי ההרים",
      inLanguage: 'he',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/dictionary?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: "מורשת ג'והורי",
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/images/og-default.png`,
      },
      description: "פרויקט לשימור שפת ג'והורית — שפת יהודי ההרים מהקווקז",
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // JSON-LD is a hardcoded server-side object, safe to inject
  const jsonLdHtml = JSON.stringify(jsonLd);

  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml }}
        />
      </head>
      <body className="font-rubik">
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}');
              `}
            </Script>
          </>
        )}
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
