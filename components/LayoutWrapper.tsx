'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import LoginPage from '@/app/login/page';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  // Allow login page without auth
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // If not ready yet, don't render anything to avoid hydration mismatch
  if (!isReady) {
    return null;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Render the protected page
  return <>{children}</>;
}
