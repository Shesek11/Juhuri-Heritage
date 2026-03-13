'use client';

import { AuthProvider } from '../../contexts/AuthContext';
import AppShell from '../shell/AppShell';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
