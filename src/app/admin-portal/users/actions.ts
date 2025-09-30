
'use server';

import { getAdminSession } from '@/app/login/actions';
import { adminDb } from '@/lib/firebase/admin';

export interface AppUser {
  id: string;
  name: string | null;
  email: string | null;
  // Temporarily removing other fields to debug
  // status: string;
  // plan: string;
  // proposals: number;
  // joined: string;
}

export async function getUsers(): Promise<AppUser[]> {
  const session = await getAdminSession();
  if (!session) {
    throw new Error('Unauthorized: You must be an admin to perform this action.');
  }

  try {
    const usersSnapshot = await adminDb.collection('users').get();
    
    if (usersSnapshot.empty) {
      return [];
    }

    // Simplified mapping to isolate the error
    const users: AppUser[] = usersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.displayName || 'N/A',
        email: data.email || 'N/A',
      };
    });

    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new Error("Failed to fetch user data from the database.");
  }
}
