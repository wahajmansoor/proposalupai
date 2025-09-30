"use server";

import { adminAuth } from '@/lib/firebase/admin';

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

async function getAdminSession() {
    const { cookies } = await import('next/headers');
    const { jwtVerify } = await import('jose');
    const ADMIN_SESSION_COOKIE = 'admin-session';
    const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'your-super-secret-jwt-key-for-admin';

    const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
    if (!token) return null;

    try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);
        return payload;
    } catch (error) {
        return null;
    }
}
