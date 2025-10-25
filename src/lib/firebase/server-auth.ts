
'use server';

import { cookies } from 'next/headers';
import type { UserRecord } from 'firebase-admin/auth';
import { FieldValue, type DocumentData } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function getCurrentUser(): Promise<{
  user: UserRecord;
  userDoc: DocumentData | null;
} | null> {
  const sessionCookie = cookies().get('__session')?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const decodedIdToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    const user = await adminAuth.getUser(decodedIdToken.uid);
    
    const userDocRef = adminDb.collection('users').doc(user.uid);
    const userDocSnap = await userDocRef.get();
    
    return { user, userDoc: userDocSnap.exists ? userDocSnap.data()! : null };

  } catch (error) {
    console.error('Error verifying session cookie:', error);
    // If the cookie is invalid, clear it and return null.
    cookies().set('__session', '', { maxAge: 0 });
    return null;
  }
}


/**
 * Increments the proposal count for a given user.
 * @param userId - The ID of the user.
 */
export async function incrementProposalCount(userId: string): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required to increment proposal count.');
  }

  const userRef = adminDb.collection('users').doc(userId);

  try {
    await userRef.update({
      proposalCount: FieldValue.increment(1),
    });
  } catch (error) {
    console.error(`Failed to increment proposal count for user ${userId}:`, error);
    // If the field doesn't exist, it might throw an error. Let's try setting it.
    try {
        const userDoc = await userRef.get();
        if (userDoc.exists) {
            // If the doc exists but the field doesn't, set it to 1
            await userRef.update({ proposalCount: 1 });
        } else {
            // This case should ideally not happen if user is created correctly
            throw new Error(`User document not found for user ${userId}.`);
        }
    } catch (setError) {
        console.error(`Failed to set proposal count for user ${userId}:`, setError);
    }
  }
}


/**
 * Decrements the proposal credits for a given user.
 * @param userId - The ID of the user.
 */
export async function decrementProposalCredits(userId: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required to decrement proposal credits.');
    }
  
    const userRef = adminDb.collection('users').doc(userId);
  
    try {
      await userRef.update({
        proposalCredits: FieldValue.increment(-1),
      });
    } catch (error) {
      console.error(`Failed to decrement proposal credits for user ${userId}:`, error);
      try {
        const userDoc = await userRef.get();
        if (userDoc.exists) {
            const data = userDoc.data();
            if (data && typeof data.proposalCredits === 'undefined') {
                await userRef.update({ proposalCredits: 0 });
            } else {
                throw new Error(`Could not decrement credits for user ${userId}.`);
            }
        } else {
            throw new Error(`User document not found for user ${userId}.`);
        }
      } catch (setError) {
        console.error(`Failed to set proposal credits for user ${userId}:`, setError);
      }
    }
}
