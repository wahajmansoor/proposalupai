
'use server';

import type { Firestore, DocumentData } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Logs a transaction to a user's credit history.
 * @param db - The Firestore admin instance.
 * @param userId - The ID of the user.
 * @param amount - The number of credits (positive for additions).
 * @param reason - A description of the transaction.
 */
async function logCreditHistory(db: Firestore, userId: string, amount: number, reason:string) {
  if (!userId || !amount || !reason) return;
  try {
    await db.collection('users').doc(userId).collection('creditHistory').add({
      amount,
      reason,
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log(`Logged ${amount} credits for user ${userId}. Reason: ${reason}`);
  } catch (error) {
    console.error(`Failed to log credit history for user ${userId}:`, error);
  }
}

/**
 * Awards referral bonus credits to the referring user.
 * @param db - The Firestore admin instance.
 * @param referralCode - The referral code of the original referrer.
 * @param newUserName - The name of the new user who subscribed.
 */
async function awardReferralBonusToReferrer(db: Firestore, referralCode: string, newUserName: string | null) {
  if (!referralCode) return;

  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('referralCode', '==', referralCode).limit(1).get();

    if (!snapshot.empty) {
      const referringUserDoc = snapshot.docs[0];
      const referredFriendName = newUserName || 'your friend';
      
      await referringUserDoc.ref.update({
        proposalCredits: FieldValue.increment(5)
      });
      
      await logCreditHistory(db, referringUserDoc.id, 5, `Referral bonus for ${referredFriendName} subscribing`);
      console.log(`Awarded 5 credits to user ${referringUserDoc.id} for successful referral.`);
    } else {
      console.warn(`Attempted to award referral bonus for non-existent referral code: "${referralCode}"`);
    }
  } catch (error) {
    console.error('Error awarding referral credits:', error);
  }
}


/**
 * Handles credit allocation when a new subscription trial starts.
 * @param db - The Firestore admin instance.
 * @param userId - The ID of the new user.
 * @param userData - The new user's Firestore document data.
 * @returns An object with the Firestore update payload.
 */
export async function handleNewTrial(db: Firestore, userId: string, userData: DocumentData) {
    let creditsToAdd = 3;
    let reason = '2-Day trial activation';

    if (userData?.referredBy) {
        creditsToAdd += 5; // Add 5 bonus credits for the new user for using a referral
        reason += ' (+5 referral bonus)';
    }
    
    await logCreditHistory(db, userId, creditsToAdd, reason);
    await db.collection('users').doc(userId).update({
        proposalCredits: FieldValue.increment(creditsToAdd)
    });
}

/**
 * Handles credit allocation when a subscription becomes active for the first time.
 * @param db - The Firestore admin instance.
 * @param userId - The ID of the user.
 * @param userData - The user's Firestore document data.
 * @param newInterval - The billing interval ('month' or 'year').
 * @returns An object with the Firestore update payload.
 */
export async function handlePlanActivation(db: Firestore, userId: string, userData: DocumentData, newInterval?: 'month' | 'year') {
    let creditsToAdd = 0;
    let reason = '';
    const updatePayload: { [key: string]: any } = {};

    if (newInterval === 'year') {
        creditsToAdd = 100;
        reason = 'Pro Yearly plan activation';
    } else if (newInterval === 'month') {
        creditsToAdd = 10;
        reason = 'Pro Monthly plan activation';
    }
    
    // Award the referrer only when the new user becomes a paying customer
    if (userData?.referredBy) {
        await awardReferralBonusToReferrer(db, userData.referredBy, userData.displayName);
        updatePayload.referredBy = FieldValue.delete(); // Remove field after awarding
    }

    if (creditsToAdd > 0) {
        updatePayload.proposalCredits = FieldValue.increment(creditsToAdd);
        await logCreditHistory(db, userId, creditsToAdd, reason);
    }
    
    if (Object.keys(updatePayload).length > 0) {
        await db.collection('users').doc(userId).update(updatePayload);
    }
}


/**
 * Handles credit allocation when a user upgrades from a monthly to a yearly plan.
 * @param db - The Firestore admin instance.
 * @param userId - The ID of the user.
 * @param userData - The user's Firestore document data.
 * @returns An object with the Firestore update payload.
 */
export async function handlePlanUpgrade(db: Firestore, userId: string, userData: DocumentData) {
    const creditsToAdd = 100;
    const reason = 'Upgraded to Pro Yearly';
    
    await logCreditHistory(db, userId, creditsToAdd, reason);
    
    await db.collection('users').doc(userId).update({
        proposalCredits: FieldValue.increment(creditsToAdd),
        upgradeBonusGiven: true, // Flag to prevent awarding again
    });
}
