import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const AboutPage = dynamic(() => import('../../../components/AboutPage'), {
  loading: () => (
    <div className="flex items-center justify-center p-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
    </div>
  ),
});

export const metadata: Metadata = {
  title: "אודות מורשת ג'והורי",
  description:
    "הכירו את הפרויקט לשימור שפת ג'והורית — מילון אינטראקטיבי, מורה AI, מתכונים ועוד. למדו על המשימה שלנו לשמר את מורשת יהודי ההרים.",
  alternates: { canonical: '/about' },
};

export default function About() {
  return <AboutPage />;
}
