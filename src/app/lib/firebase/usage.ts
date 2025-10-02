
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

  const userRef = adminDb.collection('users').doc(userId);

  try {
    await userRef.update({
      proposalCount: FieldValue.increment(1),
    });
  } catch (error) {
    console.error(`Failed to increment proposal count for user ${userId}:`, error);
    // If the field doesn't exist, it might throw an error. Let's try setting it.
    const userDoc = await userRef.get();
    if (userDoc.exists) {
        // If the doc exists but the field doesn't, set it to 1
        await userRef.update({ proposalCount: 1 });
    } else {
        // This case should ideally not happen if user is created correctly
        throw new Error(`User document not found for user ${userId}.`);
    }
  }
}
