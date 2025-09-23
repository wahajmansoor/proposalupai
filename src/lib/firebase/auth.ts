
// This file is now primarily for client-side authentication helpers,
// like password reset, which don't require server-side secrets.

import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from './config';

export async function sendPasswordReset(email: string) {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
}
