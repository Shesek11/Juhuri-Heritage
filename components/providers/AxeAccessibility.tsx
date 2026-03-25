'use client';

import { useEffect } from 'react';

export default function AxeAccessibility() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      import('@axe-core/react').then((axe) => {
        import('react-dom').then((ReactDOM) => {
          axe.default(require('react'), ReactDOM, 1000);
        });
      });
    }
  }, []);

  return null;
}
