
'use server';

import { adminDb } from './admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Increments the proposal count for a given user.
 * @param userId - The ID of the user.
 */
export async function incrementProposalCount(userId: string): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required to increment proposal count.');
  }

  if (!adminDb) {
      console.error("Failed to increment proposal count: Firebase Admin not initialized.");
      return;
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
  
    if (!adminDb) {
      console.error("Failed to decrement credits: Firebase Admin not initialized.");
      return;
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
