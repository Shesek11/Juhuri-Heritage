import type { Metadata } from 'next';
import ContributionsDashboard from './ContributionsDashboard';

export const metadata: Metadata = {
  title: 'התרומות שלי',
  description: 'מעקב אחרי התרומות שלך למילון הג\'והורי',
};

export default function ContributionsPage() {
  return (
    <main className="min-h-screen">
      <ContributionsDashboard />
    </main>
  );
}
