
"use server";

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { stripe } from "@/lib/stripe/config";

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
  if (!adminAuth) {
    throw new Error("Firebase Admin SDK not initialized. Check server logs for details.");
  }
  try {
    const listUsersResult = await adminAuth.listUsers(1000); // max 1000 per request
    const authUsers = listUsersResult.users;

    const userPromises = authUsers.map(async (user) => {
      const userDocRef = adminDb.collection('users').doc(user.uid);
      const userDoc = await userDocRef.get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        // Convert timestamp to ISO string for safe serialization
        const createdAt = userData?.createdAt?.toDate()?.toISOString() || null;
        return {
          id: user.uid,
          name: user.displayName,
          email: user.email,
          subscriptionStatus: userData?.subscriptionStatus || 'N/A',
          proposalCount: userData?.proposalCount || 0,
          subscriptionInterval: userData?.subscriptionInterval || null,
          createdAt: createdAt,
          stripeCustomerId: userData?.stripeCustomerId || null,
        };
      } else {
        // Fallback for users who might exist in Auth but not Firestore
        return {
          id: user.uid,
          name: user.displayName,
          email: user.email,
          subscriptionStatus: 'No Record',
          proposalCount: 0,
          subscriptionInterval: null,
          createdAt: null,
          stripeCustomerId: null,
        };
      }
    });

    return Promise.all(userPromises);

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

export async function deleteUser(userId: string): Promise<{ success: boolean, error?: string }> {
  try {
    if (!adminAuth) throw new Error("Firebase Admin SDK not initialized.");
    
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
