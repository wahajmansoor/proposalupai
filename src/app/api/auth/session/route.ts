
import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  const { adminAuth } = await getFirebaseAdmin();
  // Check if Firebase Admin is initialized
  if (!adminAuth) {
    console.error("Firebase Admin has not been initialized. Check your server configuration.");
    return NextResponse.json(
      { error: "Server is not configured for authentication. Please contact support." },
      { status: 500 }
    );
  }

  try {
    const { idToken } = await req.json();
    if (!idToken) {
      return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
    }
    
    // Set session expiration to 5 days.
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    const options = { name: '__session', value: sessionCookie, maxAge: expiresIn, httpOnly: true, secure: true };

    const response = NextResponse.json({ status: 'success' });
    response.cookies.set(options);
    
    return response;
  } catch (error) {
    console.error('Error creating session cookie:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const response = NextResponse.json({ status: 'success' });
  response.cookies.set('__session', '', { maxAge: -1 });
  return response;
}
