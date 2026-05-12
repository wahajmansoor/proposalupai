
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { addCreditsAction } from '@/lib/paddle-actions';

export interface AppUser {
  id: string;
  name: string | null;
  email: string | null;
  subscriptionStatus: string | null;
  proposalCount: number;
  proposalCredits: number;
  subscriptionInterval: string | null;
  createdAt: string | null;
  paddleCustomerId: string | null;
  referralCode?: string | null;
  appliedCoupon?: string | null;
  signInProvider?: string | null;
  isFeatured: boolean;
  country?: { code: string; name: string } | null;
}

export async function getUsers(): Promise<AppUser[]> {
  const users = await prisma.user.findMany({
    orderBy: { id: 'desc' }, // Or any other sorting
    include: {
      accounts: {
        take: 1
      }
    }
  });

  return users.map((user: any) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    isFeatured: user.isFeatured,
    subscriptionStatus: user.subscriptionStatus,
    proposalCount: user.proposalCount,
    proposalCredits: user.proposalCredits,
    subscriptionInterval: user.subscriptionInterval,
    createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
    paddleCustomerId: user.paddleCustomerId,
    referralCode: user.referralCode,
    appliedCoupon: user.appliedCoupon,
    signInProvider: user.accounts[0]?.provider || null,
    country: user.countryCode ? { code: user.countryCode, name: user.countryName || '' } : null,
  }));
}

export async function updateUser(formData: FormData): Promise<{ success: boolean, error?: string }> {
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const isFeatured = formData.get('isFeatured') === 'on';

  try {
    await prisma.user.update({
      where: { id },
      data: { name, email, isFeatured }
    });

    revalidatePath('/admin-portal/users');
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update user:", error);
    return { success: false, error: error.message };
  }
}

export async function toggleFeaturedUser(userId: string, isFeatured: boolean): Promise<{ success: boolean, error?: string }> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { isFeatured }
    });

    revalidatePath('/admin-portal/users');
    return { success: true };
  } catch (error: any) {
    console.error("Failed to toggle featured status:", error);
    return { success: false, error: error.message };
  }
}


const updateUserCreditsSchema = z.object({
  userId: z.string(),
  newCreditAmount: z.coerce.number().int("Credit amount must be a whole number."),
  reason: z.string().min(1, "Reason is required."),
});

export async function updateUserCredits(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const validatedFields = updateUserCreditsSchema.safeParse({
    userId: formData.get('userId'),
    newCreditAmount: formData.get('credits'),
    reason: formData.get('reason'),
  });

  if (!validatedFields.success) {
    return { success: false, error: validatedFields.error.flatten().fieldErrors.newCreditAmount?.[0] || 'Invalid data provided.' };
  }

  const { userId, newCreditAmount, reason } = validatedFields.data;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { success: false, error: 'User not found.' };
    }

    const currentCredits = user.proposalCredits || 0;
    const creditsToAdd = newCreditAmount - currentCredits;

    await addCreditsAction(userId, creditsToAdd, reason);

    revalidatePath('/admin-portal/users');
    return { success: true };

  } catch (error: any) {
    console.error("Failed to update user credits:", error);
    return { success: false, error: error.message };
  }
}


export async function deleteUser(userId: string): Promise<{ success: boolean, error?: string }> {
  try {
    await prisma.user.delete({
      where: { id: userId }
    });

    revalidatePath('/admin-portal/users');
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete user:", error);
    return { success: false, error: error.message };
  }
}


export async function createAdminCustomerPortalSession(formData: FormData): Promise<{ url?: string, error?: string }> {
  // Paddle admin portal management is usually done in the Paddle dashboard itself.
  // We could return a link to the user's specific transaction/subscription management if needed.
  return { error: "Paddle Admin management should be done via Paddle Dashboard." };
}

export async function sendPasswordResetLink(formData: FormData): Promise<{ success: boolean, error?: string }> {
  // This would typically use NextAuth's forgot password flow or a custom service.
  // For now, return a message.
  return { success: false, error: "Password reset via admin is not yet implemented with Prisma." };
}
