import type { Metadata } from 'next';
import TutorClient from './TutorClient';

export const metadata: Metadata = {
  title: "מורה פרטי AI לג'והורית",
  description:
    "למד את שפת ג'והורית עם מורה פרטי AI חכם. שאל שאלות על דקדוק, אוצר מילים ותרבות יהודי ההרים.",
  alternates: { canonical: '/tutor' },
};

export default function TutorPage() {
  return <TutorClient />;
}
