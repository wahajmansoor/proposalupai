
'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// A secret key to sign the JWT. In a real production app, this should be a long, random string.
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'your-super-secret-jwt-key-for-admin';
const ADMIN_SESSION_COOKIE = 'admin-session';

export async function adminLogin(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const validatedFields = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return { success: false, error: 'Invalid email or password format.' };
  }

  const { email, password } = validatedFields.data;

  // These credentials are intentionally simple for this example.
  // In a real app, use a secure password hashing library like bcrypt.
  const isAdminEmailValid = email === process.env.ADMIN_EMAIL;
  const isAdminPasswordValid = password === process.env.ADMIN_PASSWORD;

  if (isAdminEmailValid && isAdminPasswordValid) {
    // Create a session token (JWT)
    const payload = { sub: email, admin: true };
    const secret = new TextEncoder().encode(JWT_SECRET);
    const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1d')
        .sign(secret);
    
    // Set the token in a secure, httpOnly cookie
    cookies().set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 1 day in seconds
    });

    return { success: true };
  }

  return { success: false, error: 'Invalid credentials.' };
}

export async function adminLogout() {
    cookies().delete(ADMIN_SESSION_COOKIE);
}

export async function getAdminSession() {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as { sub: string; admin: boolean; iat: number; exp: number };
  } catch (error) {
    return null;
  }
}
