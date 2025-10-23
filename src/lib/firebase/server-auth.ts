
'use server';

import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import type { UserRecord } from 'firebase-admin/auth';
import type { DocumentData } from 'firebase-admin/firestore';

export async function getCurrentUser(): Promise<{
  user: UserRecord;
  userDoc: DocumentData | null;
} | null> {
  const sessionCookie = cookies().get('__session')?.value;

  if (!sessionCookie) {
    return null;
  }
  
  const { adminAuth, adminDb } = await getFirebaseAdmin();

  if (!adminAuth || !adminDb) {
    // This is a critical server configuration issue.
    throw new Error('The server is not configured to verify user sessions. Please check server logs.');
  }

  try {
    const decodedIdToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    const user = await adminAuth.getUser(decodedIdToken.uid);
    
    const userDocRef = adminDb.collection('users').doc(user.uid);
    const userDocSnap = await userDocRef.get();
    
    let userDocData = userDocSnap.exists ? userDocSnap.data()! : null;

    if (userDocData && !userDocData.referralCode) {
      const newReferralCode = user.uid.substring(0, 8);
      await userDocRef.update({ referralCode: newReferralCode });
      userDocData.referralCode = newReferralCode;
    }
    
    return { user, userDoc: userDocData };

  } catch (error) {
    console.error('Error verifying session cookie:', error);
    cookies().set('__session', '', { maxAge: 0 });
    return null;
  }
}
