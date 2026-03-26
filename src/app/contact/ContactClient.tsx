'use client';

import { Suspense, lazy } from 'react';

const ContactPage = lazy(() => import('../../../components/ContactPage'));

export default function ContactClient() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" /></div>}>
      <ContactPage />
    </Suspense>
  );
}
