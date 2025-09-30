
'use server';

import { getAdminSession } from '@/app/login/actions';
import { adminDb } from '@/lib/firebase/admin';

export interface AppUser {
  id: string;
  name: string | null;
  email: string | null;
  status: string;
  plan: string;
  proposals: number;
  joined: string;
}

export async function getUsers(): Promise<AppUser[]> {
  const session = await getAdminSession();
  if (!session) {
    throw new Error('Unauthorized: You must be an admin to perform this action.');
  }

  try {
    // Removed orderBy('createdAt', 'desc') to prevent missing index error.
    const usersSnapshot = await adminDb.collection('users').get();
    
    if (usersSnapshot.empty) {
      return [];
    }

    const users: AppUser[] = usersSnapshot.docs.map(doc => {
      const data = doc.data();
      
      const getPlanName = () => {
          if (data.subscriptionStatus === 'active' || data.subscriptionStatus === 'trialing' || data.subscriptionStatus === 'canceled') {
              if (data.subscriptionInterval === 'year') return 'Pro Yearly';
              if (data.subscriptionInterval === 'month') return 'Pro Monthly';
          }
          return 'N/A';
      };

      const getStatus = () => {
          if (data.subscriptionStatus === 'active') return 'Active';
          if (data.subscriptionStatus === 'trialing') return 'Trialing';
          if (data.subscriptionStatus === 'canceled') return 'Canceled';
          if (data.subscriptionStatus === 'past_due') return 'Past Due';
          return 'No Subscription';
      }

      return {
        id: doc.id,
        name: data.displayName || 'N/A',
        email: data.email || 'N/A',
        status: getStatus(),
        plan: getPlanName(),
        proposals: data.proposalCount || 0,
        joined: data.createdAt?.toDate().toLocaleDateString() || 'Unknown',
      };
    });

    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new Error("Failed to fetch user data from the database.");
  }
}
