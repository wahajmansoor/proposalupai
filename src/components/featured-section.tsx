
import { getFeaturedUsers } from '@/lib/featured-actions';
import { FeaturedUsersCarousel } from './featured-carousel';

export async function FeaturedSection() {
  const featuredUsers = await getFeaturedUsers();

  if (featuredUsers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold tracking-tight">Featured Freelancers</h3>
      </div>
      <FeaturedUsersCarousel users={featuredUsers} />
    </div>
  );
}
