'use client';

import { AuthProvider } from '@/hooks/use-auth';
import { ReactNode } from 'react';

export function Providers({
  children,
  isAiConfigured,
}: {
  children: ReactNode;
  isAiConfigured: boolean;
}) {
  return <AuthProvider isAiConfigured={isAiConfigured}>{children}</AuthProvider>;
}
