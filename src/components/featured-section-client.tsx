
'use client';

import { useEffect, useState } from 'react';
import { getFeaturedUsers, type FeaturedUser } from '@/lib/featured-actions';
import { FeaturedUsersCarousel } from './featured-carousel';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

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
    return (
<div className="w-full p-6 rounded-lg border dark:border bg-white dark:bg-card shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center md:items-center gap-4 text-center md:text-left">
            <div className="bg-primary/10 p-3 rounded-full shrink-0">
              <Crown className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                Featured Experts Coming Soon
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Become the first to be featured here! Complete your profile and send a request to get noticed by thousands of clients.
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <Button asChild className="bg-primary text-primary-foreground hover:opacity-90 rounded-full">
              <Link href="/profile">Get Featured</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
<div className="w-full pt-4 pb-4 pr-0 pl-0 md:pr-4 md:pl-4 rounded-3xl border border-slate-200 dark:border bg-white dark:bg-card shadow-sm">
      <div className="space-y-4">
        <FeaturedUsersCarousel users={users} />
      </div>
    </div>
  );
}
