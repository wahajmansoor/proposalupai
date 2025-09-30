// app/admin/users/actions.ts
"use server";

import { auth } from "@/lib/firebaseAdmin";

export interface AppUser {
  id: string;
  name: string | null;
  email: string | null;
}

export async function getUsers(): Promise<AppUser[]> {
  try {
    const list = await auth.listUsers(1000); // Max 1000 per request
    return list.users.map((user) => ({
      id: user.uid,
      name: user.displayName,
      email: user.email,
    }));
  } catch (error: any) {
    console.error("Failed to fetch user data:", error);
    throw new Error(`Failed to fetch user data: ${error.message}`);
  }
}
