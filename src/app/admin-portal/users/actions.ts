
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

export interface AppUser {
  id: string;
  name: string | null;
  email: string | null;
  subscriptionStatus: string | null;
  proposalCount: number;
  subscriptionInterval: 'month' | 'year' | null;
  createdAt: string | null; // Changed to string for serialization
  stripeCustomerId: string | null;
}

export async function getUsers(): Promise<AppUser[]> {
  // Returning mock data as Firebase Admin SDK is not configured.
  // This prevents the admin portal from crashing.
  const mockUsers: AppUser[] = [
    {
      id: 'user-1-abc',
      name: 'John Doe',
      email: 'john.doe@example.com',
      subscriptionStatus: 'active',
      proposalCount: 15,
      subscriptionInterval: 'monthly',
      createdAt: new Date('2023-08-15T10:00:00Z').toISOString(),
      stripeCustomerId: 'cus_mock_12345',
    },
    {
      id: 'user-2-def',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      subscriptionStatus: 'trialing',
      proposalCount: 3,
      subscriptionInterval: null,
      createdAt: new Date('2023-09-01T14:30:00Z').toISOString(),
      stripeCustomerId: 'cus_mock_67890',
    },
  ];

  return mockUsers;
}

const userUpdateSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name cannot be empty."),
  email: z.string().email("Invalid email address."),
});

export async function updateUser(formData: FormData): Promise<{ success: boolean, error?: string }> {
  console.log("updateUser called, but it's a mock. No changes will be saved.");
  revalidatePath('/admin-portal/users');
  return { success: true };
}

export async function deleteUser(userId: string): Promise<{ success: boolean, error?: string }> {
  console.log(`deleteUser called for ${userId}, but it's a mock. No changes will be saved.`);
  revalidatePath('/admin-portal/users');
  return { success: true };
}

const manageBillingSchema = z.object({
  stripeCustomerId: z.string(),
});

export async function createAdminCustomerPortalSession(formData: FormData): Promise<{ url?: string, error?: string }> {
    return { error: "Billing management is not available in this mock environment." };
}

const sendPasswordResetSchema = z.object({
    email: z.string().email("Invalid email provided."),
});

export async function sendPasswordResetLink(formData: FormData): Promise<{ success: boolean; error?: string }> {
    const validatedFields = sendPasswordResetSchema.safeParse({
        email: formData.get('email'),
    });

    if (!validatedFields.success) {
        return { success: false, error: "Invalid email address." };
    }
    const { email } = validatedFields.data;
    
    console.log(`(Simulated) Password reset email sent to ${email}.`);
    
    return { success: true };
}
