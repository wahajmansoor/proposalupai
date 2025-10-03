
'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { redirect } from 'next/navigation';

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
    
    cookies().set(ADMIN_SESSION_COOKIE, token, {
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
    cookies().delete(ADMIN_SESSION_COOKIE);
    redirect('/admin-login');
}

export async function getAdminSession(): Promise<JWTPayload | null> {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const secret = await getSecretKey();
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    // If token is invalid, it will throw. We can safely return null.
    return null;
  }
}
