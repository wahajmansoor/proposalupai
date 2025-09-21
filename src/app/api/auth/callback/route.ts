
import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { headers } from 'next/headers';
import type { UserRecord } from 'firebase-admin/auth';
import { stripe } from '@/lib/stripe/config';

export async function GET(req: NextRequest) {
  const headersList = headers();
  const protocol = headersList.get('x-forwarded-proto') || 'http';
  const host = headersList.get('host');
  const redirectUri = `${protocol}://${host}/api/auth/callback`;
  const errorRedirectUrl = new URL('/login', `${protocol}://${host}`);

  const oAuth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

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
    
    const displayName = name;
    
    // Conditionally build the user update/create payload
    const userPayload: { [key: string]: any } = {
        displayName: displayName,
    };
    if (picture) {
        userPayload.photoURL = picture;
    }

    try {
      userRecord = await adminAuth.getUserByEmail(email);
      await adminAuth.updateUser(userRecord.uid, userPayload);

    } catch (e: any) {
      if (e.code === 'auth/user-not-found') {
        userRecord = await adminAuth.createUser({
            uid: uid, 
            email,
            emailVerified: email_verified,
            ...userPayload, // Spread the payload here
            disabled: false,
        });
      } else {
        throw e;
      }
    }
    
    const userRef = adminDb.collection('users').doc(userRecord.uid);
    const userDoc = await userRef.get();

    const userData: { [key: string]: any } = {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: displayName,
    };
     if (picture) {
        userData.photoURL = picture;
    }
    
    if (!userDoc.exists) {
        const customer = await stripe.customers.create({
            email: userRecord.email!,
            name: userRecord.displayName || undefined,
            metadata: {
                firebaseUID: userRecord.uid,
            },
        });

        userData.createdAt = new Date();
        userData.stripeCustomerId = customer.id;

        await userRef.set(userData, { merge: true });
    } else {
        // For existing users, just update their profile info.
        // Don't overwrite stripe or trial data.
        await userRef.update(userData);
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
