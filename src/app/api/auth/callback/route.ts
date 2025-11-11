
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { headers } from 'next/headers';
import type { UserRecord } from 'firebase-admin/auth';
import { stripe } from '@/lib/stripe/config';
import { getCountryFromIp } from '@/app/lib/location';
import { v4 as uuidv4 } from 'uuid';
import { FieldValue } from 'firebase-admin/firestore';


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
  const state = searchParams.get('state');

  // Extract referral code from state
  let referralCode: string | null = null;
  if (state) {
    try {
      const decodedState = JSON.parse(decodeURIComponent(state));
      referralCode = decodedState.referralCode;
    } catch (e) {
      console.warn("Could not parse state for referral code", e);
    }
  }


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
    
    const { email, name, picture, email_verified } = payload;
    let userRecord: UserRecord;
    
    const displayName = name;
    
    const userPayload: { [key: string]: any } = {
        displayName: displayName,
        emailVerified: email_verified,
        disabled: false,
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
            uid: payload.sub,
            email,
            ...userPayload,
        });
      } else {
        throw e;
      }
    }
    
    const userRef = adminDb.collection('users').doc(userRecord.uid);
    const userDoc = await userRef.get();
    
    // --- SINGLE SESSION POLICY CHECK ---
    if (userDoc.exists && userDoc.data()?.currentSession) {
        console.warn(`Blocking new login for ${email} - active session exists.`);
        errorRedirectUrl.searchParams.set('error', 'session-exists');
        errorRedirectUrl.searchParams.set('details', 'An active session for this account already exists on another device. Please log out from the other device first.');
        return NextResponse.redirect(errorRedirectUrl);
    }

    const newSessionId = uuidv4();
    
    if (!userDoc.exists) {
        const customer = await stripe.customers.create({
            email: userRecord.email!,
            name: userRecord.displayName || undefined,
            metadata: {
                firebaseUID: userRecord.uid,
            },
        });
        
        const ip = headersList.get('x-forwarded-for') || req.ip;
        const country = await getCountryFromIp(ip);

        const userData: { [key: string]: any } = {
            uid: userRecord.uid,
            email: userRecord.email,
            displayName: displayName,
            createdAt: FieldValue.serverTimestamp(),
            stripeCustomerId: customer.id,
            proposalCount: 0,
            subscriptionStatus: null,
            country: country,
            referralCode: userRecord.uid.substring(0, 8),
            onboardingComplete: false,
            currentSession: newSessionId,
            lastLogin: FieldValue.serverTimestamp(),
        };
        
        if (referralCode) {
          userData.referredBy = referralCode;
        }
        
        if (picture) {
            userData.photoURL = picture;
        }
        await userRef.set(userData, { merge: true });
    } else {
        // User exists, just update session info
        await userRef.update({
            currentSession: newSessionId,
            lastLogin: FieldValue.serverTimestamp(),
        });
    }

    const customToken = await adminAuth.createCustomToken(userRecord.uid, { sessionId: newSessionId });
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
