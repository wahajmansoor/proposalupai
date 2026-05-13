
'use server';

import prisma from "@/lib/prisma";
import { v4 as uuidv4 } from 'uuid';
import { sendPasswordResetEmail } from "./email-actions";
import * as bcrypt from "bcryptjs";

export async function forgotPasswordAction(email: string) {
    if (!email) return { error: "Email is required." };

    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
    });

    if (!user) {
        // We return success even if user not found for security reasons 
        // (to prevent email enumeration)
        return { success: true, message: "If an account exists with that email, a reset link has been sent." };
    }

    // Delete any existing tokens for this email
    await prisma.passwordResetToken.deleteMany({
        where: { email: user.email! }
    });

    // Create new token (expires in 1 hour)
    const token = uuidv4();
    const expires = new Date(Date.now() + 3600000);

    await prisma.passwordResetToken.create({
        data: {
            email: user.email!,
            token,
            expires
        }
    });

    // Send email
    const emailResult = await sendPasswordResetEmail(user.email!, token);

    if (emailResult.error) {
        return { error: emailResult.error };
    }

    return { success: true, message: "A reset link has been sent to your email." };
}

export async function resetPasswordAction(token: string, newPassword: string) {
    if (!token || !newPassword) return { error: "Token and password are required." };

    if (newPassword.length < 8) {
        return { error: "Password must be at least 8 characters long." };
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token }
    });

    if (!resetToken || resetToken.expires < new Date()) {
        return { error: "Invalid or expired reset token." };
    }

    const user = await prisma.user.findUnique({
        where: { email: resetToken.email }
    });

    if (!user) {
        return { error: "User not found." };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user and delete token
    await prisma.$transaction([
        prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        }),
        prisma.passwordResetToken.delete({
            where: { id: resetToken.id }
        })
    ]);

    return { success: true, message: "Password has been reset successfully." };
}
