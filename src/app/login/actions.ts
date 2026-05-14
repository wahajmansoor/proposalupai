
'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { isAdmin as checkAdmin } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'your-super-secret-jwt-key-for-admin';
const ADMIN_SESSION_COOKIE = 'admin-session';

if (JWT_SECRET === 'your-super-secret-jwt-key-for-admin') {
    console.warn('Warning: Using default JWT secret for admin session. Please set ADMIN_JWT_SECRET in your .env.local file.');
}

async function getSecretKey() {
    return new TextEncoder().encode(JWT_SECRET);
}

export async function adminLogin(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const validatedFields = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return { success: false, error: 'Invalid email or password format.' };
  }

  const { email, password } = validatedFields.data;

  // Ensure these environment variables are set
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
      console.error("ADMIN_EMAIL or ADMIN_PASSWORD environment variables are not set.");
      return { success: false, error: "Admin account is not configured on the server."};
  }

  const isAdminEmailValid = email === adminEmail;
  const isAdminPasswordValid = password === adminPassword;

  if (isAdminEmailValid && isAdminPasswordValid) {
    // Create a session token (JWT)
    const payload = { sub: email, admin: true };
    const secret = await getSecretKey();
    const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1d')
        .sign(secret);
    
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 1 day
    });

    return { success: true };
  }

  return { success: false, error: 'Invalid credentials.' };
}

export async function adminLogout() {
    const cookieStore = await cookies();
    cookieStore.delete(ADMIN_SESSION_COOKIE);
    redirect('/admin-login');
}

export async function getAdminSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  
  // 1. Try Custom Admin Cookie
  if (token) {
    try {
      const secret = await getSecretKey();
      const { payload } = await jwtVerify(token, secret);
      return payload;
    } catch (error) {
      // Token invalid, fall through to NextAuth check
    }
  }

  // 2. Try NextAuth Session Fallback
  try {
    const nextSession = await auth();
    if (nextSession?.user?.email && checkAdmin(nextSession.user.email)) {
      return { sub: nextSession.user.email, admin: true } as JWTPayload;
    }
  } catch (error) {
    console.error("ADMIN_SESSION_NEXTAUTH_CHECK_ERROR:", error);
  }

  return null;
}
