
'use client';

import { useEffect, useState } from 'react';
import { getFeaturedUsers, type FeaturedUser } from '@/lib/featured-actions';
import { FeaturedUsersCarousel } from './featured-carousel';
import { Skeleton } from '@/components/ui/skeleton';

export function FeaturedSectionClient() {
  const [users, setUsers] = useState<FeaturedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    async function loadUsers() {
      try {
        const data = await getFeaturedUsers();
        setUsers(data);
      } catch (error) {
        console.error('Failed to load featured users:', error);
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  if (!isMounted) return null;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (users.length === 0) {
    return null;
  }

  return (
    <div className="relative p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950 overflow-hidden shadow-sm">
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl opacity-50" />
      
      <div className="relative z-10 space-y-4">
        <FeaturedUsersCarousel users={users} />
      </div>
    </div>
  );
}
