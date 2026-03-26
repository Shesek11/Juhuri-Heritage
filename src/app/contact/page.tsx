import type { Metadata } from 'next';
import ContactClient from './ContactClient';

export const metadata: Metadata = {
  title: 'צור קשר',
  description: 'צרו קשר עם צוות מורשת ג׳והורי — שאלות, הצעות, שיתופי פעולה',
};

export default function Contact() {
  return <ContactClient />;
}
