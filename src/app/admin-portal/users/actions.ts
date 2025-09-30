"use server";

import { adminAuth } from "@/lib/firebase/admin";

export interface AppUser {
  id: string;
  name: string | null;
  email: string | null;
}

export async function getUsers(): Promise<AppUser[]> {
  console.log("adminAuth is:", adminAuth);
  if (!adminAuth) {
    throw new Error("Firebase Admin SDK not initialized. Check server logs for details.");
  }
  try {
    const list = await adminAuth.listUsers(1000); // max 1000 per request
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
