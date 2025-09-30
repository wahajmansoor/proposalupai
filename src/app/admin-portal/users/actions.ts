
"use server";

import { adminAuth } from "@/lib/firebase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export interface AppUser {
  id: string;
  name: string | null;
  email: string | null;
}

export async function getUsers(): Promise<AppUser[]> {
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

const userUpdateSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name cannot be empty."),
  email: z.string().email("Invalid email address."),
});

export async function updateUser(formData: FormData): Promise<{ success: boolean, error?: string }> {
  const validatedFields = userUpdateSchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    email: formData.get('email'),
  });

  if (!validatedFields.success) {
    return { success: false, error: "Invalid data provided." };
  }

  const { id, name, email } = validatedFields.data;

  try {
    if (!adminAuth) throw new Error("Firebase Admin SDK not initialized.");
    await adminAuth.updateUser(id, {
      displayName: name,
      email: email,
    });
    revalidatePath('/admin-portal/users');
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update user:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteUser(userId: string): Promise<{ success: boolean, error?: string }> {
  try {
    if (!adminAuth) throw new Error("Firebase Admin SDK not initialized.");
    await adminAuth.deleteUser(userId);
    revalidatePath('/admin-portal/users');
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete user:", error);
    return { success: false, error: error.message };
  }
}
