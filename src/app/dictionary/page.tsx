import type { Metadata } from 'next';
import DictionarySearch from './DictionarySearch';

export const metadata: Metadata = {
  title: "מילון ג'והורי-עברי",
  description:
    "מילון ג'והורי-עברי אינטראקטיבי — חפש מילים בג'והורית, עברית, רוסית ואנגלית. שמע הגייה, צפה בתרגומים ולמד את שפת יהודי ההרים.",
  alternates: { canonical: '/dictionary' },
};

export default function DictionaryPage() {
  return (
    <main className="min-h-screen overflow-x-hidden min-w-0 w-full">
      <DictionarySearch />
    </main>
  );
}
