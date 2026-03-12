import type { Metadata } from 'next';
import FamilyTreeLoader from './FamilyTreeLoader';

export const metadata: Metadata = {
  title: 'עץ משפחתי',
  description:
    "צפה בעץ המשפחתי של קהילת יהודי ההרים. חקור קשרי משפחה, מפות היסטוריות ומסעות הקהילה.",
};

export default function FamilyPage() {
  return (
    <main className="min-h-screen">
      <FamilyTreeLoader />
    </main>
  );
}
