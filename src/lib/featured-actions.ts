'use server';

import prisma from './prisma';

export interface FeaturedUser {
  id: string;
  name: string | null;
  image: string | null;
  title: string | null;
  bio: string | null;
  services: string | null;
  email: string | null;
  whatsapp: string | null;
}

export async function getFeaturedUsers(): Promise<FeaturedUser[]> {
  try {
    const users = await prisma.user.findMany({
      where: {
        isFeatured: true,
      },
      select: {
        id: true,
        name: true,
        image: true,
        title: true,
        bio: true,
        services: true,
        email: true,
        whatsapp: true,
      },
    });

    return users;
  } catch (error) {
    console.error('Error fetching featured users:', error);
    return [];
  }
}
