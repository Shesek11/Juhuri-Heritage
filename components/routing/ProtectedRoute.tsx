'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

function RedirectHome() {
  const router = useRouter();
  useEffect(() => { router.replace('/'); }, [router]);
  return null;
}

interface ProtectedRouteProps {
  roles: string[];
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ roles, children }) => {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return <RedirectHome />;
  }

  return <>{children}</>;
};
