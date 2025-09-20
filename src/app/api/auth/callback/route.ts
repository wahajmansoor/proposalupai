import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import dotenv from 'dotenv';

dotenv.config();

export async function GET(req: NextRequest) {
  // Initialize the OAuth2Client inside the handler to ensure env vars are loaded.
  const oAuth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_URL}/api/auth/callback`
  );

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    console.error('Error from Google:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_URL}/login?error=google-auth-failed`);
  }

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_URL}/login?error=missing-code`);
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

    const { sub: uid, email, name, picture } = payload;
    let userRecord;

    try {
      // Use getUser instead of getUserByEmail for a more direct lookup
      userRecord = await adminAuth.getUser(uid);
    } catch (e: any) {
      if (e.code === 'auth/user-not-found') {
        // User doesn't exist, create them with the Google UID
        userRecord = await adminAuth.createUser({
          uid,
          email,
          emailVerified: true,
          displayName: name,
          photoURL: picture,
          disabled: false,
        });

      } else {
        // For other errors, re-throw
        throw e;
      }
    }
    
    // Ensure Firestore document exists for both new and existing users
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
    const redirectUrl = new URL('/auth/callback-client', process.env.NEXT_PUBLIC_URL);
    redirectUrl.searchParams.set('token', customToken);

    return NextResponse.redirect(redirectUrl.toString());

  } catch (err: any) {
    console.error('Failed to exchange code for token:', err.message);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_URL}/login?error=token-exchange-failed`);
  }
}
