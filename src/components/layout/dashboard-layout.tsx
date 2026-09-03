'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/types/roles';

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: UserRole;
  userName: string;
  profileId: string;
}

export function DashboardLayout({ children, role, userName, profileId }: DashboardLayoutProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        role={role}
        userName={userName}
        profileId={profileId}
        onSignOut={handleSignOut}
      />
      <main className="flex-1 min-w-0 lg:overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
