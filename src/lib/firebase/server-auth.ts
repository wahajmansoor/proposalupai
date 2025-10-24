
'use server';

import { adminAuth, adminDb } from '@/lib/firebase/admin';
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
