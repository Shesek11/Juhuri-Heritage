import type { Metadata } from 'next';
import './globals.css';
import AppProviders from '../components/providers/AppProviders';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'https://jun-juhuri.com'),
  title: {
    default: "מורשת ג'והורי | המילון לשימור השפה",
    template: "%s | מורשת ג'והורי",
  },
  description:
    "מילון ג'והורי-עברי אינטראקטיבי לשימור שפת יהודי ההרים (ג'והורית). חפש מילים, למד את השפה ותרום לשימור המורשת.",
  keywords: ["ג'והורי", 'Juhuri', 'יהודי ההרים', 'מילון', 'שפה', 'מורשת', 'קווקז'],
  openGraph: {
    title: "מורשת ג'והורי - המילון לשימור השפה",
    description: "מילון ג'והורי-עברי אינטראקטיבי עם מורה פרטי AI",
    type: 'website',
    locale: 'he_IL',
    url: '/',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body className="bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
