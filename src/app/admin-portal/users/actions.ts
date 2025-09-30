
'use server';

import { adminAuth } from '@/lib/firebase/admin';
import { getAdminSession } from '@/app/login/actions';

export interface AppUser {
  id: string;
  name: string | null;
  email: string | null;
}

export async function getUsers(): Promise<AppUser[]> {
  const session = await getAdminSession();
  if (!session) {
    throw new Error('Unauthorized: You must be an admin to perform this action.');
  }

  try {
    const listUsersResult = await adminAuth.listUsers(1000); // max 1000 per request
    const users: AppUser[] = listUsersResult.users.map(userRecord => ({
      id: userRecord.uid,
      name: userRecord.displayName || null,
      email: userRecord.email || null,
    }));
    return users;
  } catch (error: any) {
    console.error("Failed to fetch user data:", error);
    throw new Error(`Failed to fetch user data: ${error.message}`);
  }
}
