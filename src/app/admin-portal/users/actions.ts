
"use server";

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { stripe } from "@/lib/stripe/config";
import { addCredits } from "@/lib/stripe-actions";

export interface AppUser {
  id: string;
  name: string | null;
  email: string | null;
  subscriptionStatus: string | null;
  proposalCount: number;
  proposalCredits: number;
  subscriptionInterval: 'month' | 'year' | null;
  createdAt: string | null; // Changed to string for serialization
  stripeCustomerId: string | null;
  country?: { code: string; name: string };
  referralCode?: string;
}

export async function getUsers(): Promise<AppUser[]> {
  const listUsersResult = await adminAuth.listUsers(1000); // max 1000 per request
  const authUsers = listUsersResult.users;

  const userPromises = authUsers.map(async (user, index) => {
    const userDocRef = adminDb.collection('users').doc(user.uid);
    const userDoc = await userDocRef.get();
    
    let userData: any;

    if (userDoc.exists) {
      userData = userDoc.data();
      
      // ** Backfill referral code for any user who doesn't have one **
      if (!userData?.referralCode) {
          const newReferralCode = user.uid.substring(0, 8);
          await userDocRef.update({ referralCode: newReferralCode });
          userData.referralCode = newReferralCode; // Update local object immediately
      }

      // Convert timestamp to ISO string for safe serialization
      const createdAt = userData?.createdAt?.toDate()?.toISOString() || null;
      return {
        id: user.uid,
        name: userData?.displayName || user.displayName, // Prioritize Firestore displayName
        email: user.email,
        subscriptionStatus: userData?.subscriptionStatus || 'N/A',
        proposalCount: userData?.proposalCount || 0,
        proposalCredits: userData?.proposalCredits || 0,
        subscriptionInterval: userData?.subscriptionInterval || null,
        createdAt: createdAt,
        stripeCustomerId: userData?.stripeCustomerId || null,
        country: userData?.country || null,
        referralCode: userData?.referralCode || null,
      };
    } else {
      // Fallback for users who might exist in Auth but not Firestore
      return {
        id: user.uid,
        name: user.displayName,
        email: user.email,
        subscriptionStatus: 'No Record',
        proposalCount: 0,
        proposalCredits: 0,
        subscriptionInterval: null,
        createdAt: null,
        stripeCustomerId: null,
        country: null,
        referralCode: null,
      };
    }
  });

  return Promise.all(userPromises);
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
    await adminAuth.updateUser(id, {
      displayName: name,
      email: email,
    });
    // Also update firestore
    const userDocRef = adminDb.collection('users').doc(id);
    await userDocRef.update({ displayName: name, email: email });

    revalidatePath('/admin-portal/users');
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update user:", error);
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
        const userRef = adminDb.collection('users').doc(userId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            return { success: false, error: 'User not found.' };
        }
        const currentCredits = userDoc.data()?.proposalCredits || 0;
        const creditsToAdd = newCreditAmount - currentCredits;
        
        await addCredits(adminDb, userRef, creditsToAdd, reason);

        revalidatePath('/admin-portal/users');
        return { success: true };

    } catch (error: any) {
        console.error("Failed to update user credits:", error);
        return { success: false, error: error.message };
    }
}


export async function deleteUser(userId: string): Promise<{ success: boolean, error?: string }> {
  try {
    // Delete from Firebase Auth
    await adminAuth.deleteUser(userId);
    
    // Delete from Firestore
    const userDocRef = adminDb.collection('users').doc(userId);
    await userDocRef.delete();

    revalidatePath('/admin-portal/users');
    return { success: true };
  } catch (error: any)
   {
    console.error("Failed to delete user:", error);
    // If user is already deleted from auth, but not from firestore, we can still proceed to delete from firestore
    if (error.code === 'auth/user-not-found') {
        try {
            const userDocRef = adminDb.collection('users').doc(userId);
            await userDocRef.delete();
            revalidatePath('/admin-portal/users');
            return { success: true };
        } catch (dbError: any) {
            console.error("Failed to delete user from Firestore after Auth deletion failed:", dbError);
            return { success: false, error: dbError.message };
        }
    }
    return { success: false, error: error.message };
  }
}

const manageBillingSchema = z.object({
  stripeCustomerId: z.string(),
});

export async function createAdminCustomerPortalSession(formData: FormData): Promise<{ url?: string, error?: string }> {
    const validatedFields = manageBillingSchema.safeParse({
        stripeCustomerId: formData.get('stripeCustomerId'),
    });

    if (!validatedFields.success) {
        return { error: "Invalid Stripe Customer ID provided." };
    }

    const { stripeCustomerId } = validatedFields.data;
    
    const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/admin-portal/users`;

    try {
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: returnUrl,
        });

        if (!portalSession.url) {
          return { error: 'Could not create customer portal session.' };
        }

        return { url: portalSession.url };

    } catch (error: any) {
        console.error("Error creating admin customer portal session:", error);
        return { error: error.message || "Failed to create billing session." };
    }
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

    try {
        await adminAuth.generatePasswordResetLink(email);
        console.log(`(Simulated) Password reset link generation successful for ${email}. In a real app, you would now send this link via email.`);
        return { success: true };
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            // It's often better not to reveal if an email exists in the system
            console.log(`Password reset attempted for non-existent user: ${email}`);
            return { success: true }; // Still return success to prevent user enumeration
        }
        console.error("Failed to generate password reset link:", error);
        return { success: false, error: error.message };
    }
}
