import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { headers } from 'next/headers';
import type { UserRecord } from 'firebase-admin/auth';

export async function GET(req: NextRequest) {
  const headersList = headers();
  const protocol = headersList.get('x-forwarded-proto') || 'http';
  const host = headersList.get('host');
  const redirectUri = `${protocol}://${host}/api/auth/callback`;

  const oAuth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const errorRedirectUrl = new URL('/login', `${protocol}://${host}`);

  if (error) {
    console.error('Error from Google:', error);
    errorRedirectUrl.searchParams.set('error', 'google-auth-failed');
    return NextResponse.redirect(errorRedirectUrl);
  }

  if (!code) {
    errorRedirectUrl.searchParams.set('error', 'missing-code');
    return NextResponse.redirect(errorRedirectUrl);
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    if (!tokens.id_token) {
      throw new Error('ID token not found in Google response');
    }
    
    oAuth2Client.setCredentials(tokens);
    
    const loginTicket = await oAuth2Client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = loginTicket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      throw new Error('Invalid ID token payload');
    }

    const { sub: uid, email, name, picture, email_verified } = payload;
    let userRecord: UserRecord;

    try {
      // First, try to get the user by their Google UID. This is the standard case.
      userRecord = await adminAuth.getUser(uid);
    } catch (e: any) {
      if (e.code === 'auth/user-not-found') {
        // If user not found by UID, they might have an account with the same email
        // created via a different provider (e.g., email/password).
        try {
            userRecord = await adminAuth.getUserByEmail(email);
            // If we found a user by email, we should consider updating their UID if the provider is different,
            // but for now, we'll just use this record. This links the Google sign-in to the existing email.
            // For more complex scenarios, you might link accounts.
        } catch (emailError: any) {
             if (emailError.code === 'auth/user-not-found') {
                // If no user exists with this email either, create a new one.
                userRecord = await adminAuth.createUser({
                    uid, // Use the Google UID for the new user
                    email,
                    emailVerified: email_verified,
                    displayName: name,
                    photoURL: picture,
                    disabled: false,
                });
             } else {
                 // Rethrow other errors from getUserByEmail
                 throw emailError;
             }
        }
      } else {
        // Rethrow other errors from getUser
        throw e;
      }
    }
    
    // Ensure Firestore document exists for this user.
    const userRef = doc(adminDb, 'users', userRecord.uid);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
        await setDoc(userRef, {
            uid: userRecord.uid,
            email: userRecord.email,
            displayName: userRecord.displayName,
            photoURL: userRecord.photoURL,
            createdAt: serverTimestamp(),
        });
    }

    const customToken = await adminAuth.createCustomToken(userRecord.uid);
    const redirectUrl = new URL('/auth/callback-client', `${protocol}://${host}`);
    redirectUrl.searchParams.set('token', customToken);

    return NextResponse.redirect(redirectUrl.toString());

  } catch (err: any) {
    console.error('Failed to exchange code for token:', err);
    errorRedirectUrl.searchParams.set('error', 'token-exchange-failed');
    errorRedirectUrl.searchParams.set('details', err.message);
    return NextResponse.redirect(errorRedirectUrl);
  }
}
