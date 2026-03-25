'use client';

import { AuthProvider } from '../../contexts/AuthContext';
import AppShell from '../shell/AppShell';
import AxeAccessibility from './AxeAccessibility';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AxeAccessibility />
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
