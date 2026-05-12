
'use server';

import { paddle } from './paddle/config';
import { auth } from '@/auth';
import prisma from './prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// --- Credit Handling Logic (Prisma version) ---
export async function addCreditsAction(userId: string, amount: number, reason: string) {
    try {
        await prisma.$transaction(async (tx: any) => {
            const user = await tx.user.findUnique({
                where: { id: userId }
            });

            if (!user) {
                throw new Error(`User ${userId} not found.`);
            }

            await tx.user.update({
                where: { id: userId },
                data: {
                    proposalCredits: {
                        increment: amount
                    }
                }
            });

            // Log the credit transaction in CreditHistory
            await tx.creditHistory.create({
                data: {
                    userId,
                    amount,
                    reason,
                }
            });
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error adding credits:", error);
        return { error: error.message };
    }
}

// --- Paddle Portal Action ---
export async function createPaddlePortalSession() {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: 'User not authenticated.' };
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id }
    });

    if (!user?.paddleCustomerId) {
        return { error: 'No Paddle customer record found for this user.' };
    }

    try {
        // Paddle doesn't have a single "Billing Portal" like Stripe.
        // It has management links for specific subscriptions.
        if (!user.paddleSubscriptionId) {
            return { error: 'No active subscription found to manage.' };
        }

        // Generating a management URL for the subscription
        // This is typically handled by Paddle.js on the client side, 
        // but for a server-side "session" we might return the customer's portal link if using Paddle Billing.

        // If using Paddle Billing (new), you can use:
        // Note: Check if your Paddle SDK version supports this. 
        // If not, you might need to use a different approach or redirect to a help page.
        try {
            const portalSession = await paddle.customerPortalSessions.create(user.paddleCustomerId, []);
            return { url: portalSession.urls.general.overview };
        } catch (e) {
            return { error: 'Paddle Customer Portal is not enabled for this account or SDK version.' };
        }

    } catch (error: any) {
        console.error('Error creating Paddle portal session:', error);
        return { error: 'Failed to create management session.' };
    }
}

export async function listDiscountsAction() {
    try {
        const discounts = await paddle.discounts.list();
        // Since 'data' is private, we should iterate over the collection
        // And convert to plain objects to avoid serialization issues
        const discountsArray = [];
        for await (const discount of discounts) {
            discountsArray.push({
                id: discount.id,
                code: discount.code,
                description: discount.description,
                amount: discount.amount,
                type: discount.type,
                restrictTo: discount.restrictTo,
            });
        }
        return { success: true, discounts: discountsArray };
    } catch (error: any) {
        console.error("Error listing discounts:", error);
        return { error: error.message };
    }
}

export async function createDiscountAction(data: { code: string; description: string; amount: number; currencyCode: string; type: 'flat' | 'percentage'; restrictToProduct?: string }) {
    try {
        const createParams: any = {
            code: data.code,
            description: data.description,
            amount: data.type === 'flat' ? (data.amount * 100).toString() : data.amount.toString(),
            currencyCode: data.currencyCode as any,
            enabledForCheckout: true,
            type: data.type,
        };

        if (data.restrictToProduct && data.restrictToProduct !== 'none') {
            createParams.restrictTo = [data.restrictToProduct];
        }

        const discount = await paddle.discounts.create(createParams);
        return {
            success: true, discount: {
                id: discount.id,
                code: discount.code,
                description: discount.description,
                amount: discount.amount,
                type: discount.type
            }
        };
    } catch (error: any) {
        console.error("Error creating discount:", error);
        return { error: error.message };
    }
}


export async function checkUserStatusAction() {
    try {
        const session = await auth();
        if (!session?.user?.id) return { error: "Unauthorized" };

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                proposalCredits: true,
                subscriptionStatus: true,
            }
        });

        if (!user) return { error: "User not found" };

        return { data: user };
    } catch (error: any) {
        console.error("Error checking user status:", error);
        return { error: error.message };
    }
}
