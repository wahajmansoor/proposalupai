
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const { uid, sessionId } = await req.json();
    if (!uid || !sessionId) {
      return NextResponse.json({ error: 'UID and Session ID are required' }, { status: 400 });
    }
    
    const customToken = await adminAuth.createCustomToken(uid, { sessionId });
    
    return NextResponse.json({ customToken });
  } catch (error) {
    console.error('Error creating custom token:', error);
    return NextResponse.json({ error: 'Failed to create custom token' }, { status: 500 });
  }
}
