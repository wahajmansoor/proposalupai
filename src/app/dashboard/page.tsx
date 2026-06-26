import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HugeiconsIcon } from '@hugeicons/react';
import { FileEditIcon, StarIcon, BookmarkIcon, Profile02Icon } from "@hugeicons/core-free-icons";
import { FeaturedSectionClient } from '@/components/featured-section-client';

export default async function DashboardOverview() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return null;

  const [proposalsCount, profilesCount] = await Promise.all([
    prisma.savedProposal.count({ where: { userId } }),
    prisma.skillProfile.count({ where: { userId } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your account and recent activity.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link id="tour-dashboard-create" href="/create-proposal" className="block transition-transform hover:scale-[1.02]">
          <Card className="h-full bg-gradient-to-br from-primary/10 via-background to-background border-primary/20 shadow-lg shadow-primary/5 relative overflow-hidden group hover:shadow-xl transition-all cursor-pointer">
            <div className="absolute inset-0 bg-grid-primary/5 [mask-image:linear-gradient(to_bottom_right,white,transparent)]" />
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 relative z-10">
              <div className="space-y-1 mt-1">
                <CardTitle className="text-2xl font-bold text-foreground">Land Your Next Client</CardTitle>
                <CardDescription className="text-muted-foreground">Let AI craft your perfect pitch in seconds.</CardDescription>
              </div>
              <HugeiconsIcon icon={FileEditIcon} className="h-10 w-10 text-primary opacity-80" />
            </CardHeader>
            <CardContent className="pt-4 relative z-10">
              <Button className="w-auto px-6 gap-2 shadow-md transition-all group-hover:scale-[1.02] pointer-events-none">
                <HugeiconsIcon icon={FileEditIcon} className="h-4 w-4" />
                Create New Proposal
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link id="tour-dashboard-saved" href="/proposals" className="block transition-transform hover:scale-[1.02]">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saved Proposals</CardTitle>
              <HugeiconsIcon icon={BookmarkIcon} className="h-10 w-10 text-muted-foreground/50" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{proposalsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Generated and saved</p>
            </CardContent>
          </Card>
        </Link>
        
        <Link id="tour-dashboard-profiles" href="/skill-profiles" className="block transition-transform hover:scale-[1.02]">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Skill Profiles</CardTitle>
              <HugeiconsIcon icon={Profile02Icon} className="h-10 w-10 text-muted-foreground/50" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profilesCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Active profiles for targeting</p>
            </CardContent>
          </Card>
        </Link>
      </div>
      <div className="mt-8">
        <FeaturedSectionClient />
      </div>
    </div>
  );
}
