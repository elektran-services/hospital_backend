'use client';

import { ProtectedRoute } from '@/contexts/AuthContext';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div>{children}</div>
    </ProtectedRoute>
  );
}
