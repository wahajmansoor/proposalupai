
"use server";

import { stripe } from "@/lib/stripe/config";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type Stripe from "stripe";

export interface CouponWithPromotionCode extends Stripe.Coupon {
    promotion_code: string;
}


export async function getCoupons(): Promise<CouponWithPromotionCode[]> {
  try {
    const promoCodes = await stripe.promotionCodes.list({ active: true, limit: 100, expand: ['data.coupon'] });

    const coupons = promoCodes.data.map(promoCode => {
        // Ensure that coupon is an object before spreading
        if (typeof promoCode.coupon === 'object' && promoCode.coupon !== null) {
            const coupon = promoCode.coupon as Stripe.Coupon;
            return {
                ...coupon,
                promotion_code: promoCode.code,
            };
        }
        return null;
    }).filter((c): c is CouponWithPromotionCode => c !== null);

    const uniqueCoupons = Array.from(new Map(coupons.map(c => [c.id, c])).values());
    uniqueCoupons.sort((a, b) => (b.created || 0) - (a.created || 0));

    return uniqueCoupons;

  } catch (error: any) {
    console.error("Failed to fetch coupons from Stripe:", error);
    throw new Error(`Failed to fetch coupons: ${error.message}`);
  }
}

export async function createCoupon(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const code = formData.get('code') as string;
  const type = formData.get('type') as string;
  const percent_off = formData.get('percent_off') ? Number(formData.get('percent_off')) : undefined;
  const amount_off = formData.get('amount_off') ? Number(formData.get('amount_off')) : undefined;
  const duration = formData.get('duration') as "once" | "repeating" | "forever";
  const duration_in_months = formData.get('duration_in_months') ? Number(formData.get('duration_in_months')) : undefined;
  const applies_to = (formData.get('applies_to') as string) || 'any';

  if (!code) {
      return { success: false, error: "Promotion code is required." };
  }

  try {
    const couponParams: Stripe.CouponCreateParams = {
      name: code, 
      duration,
      metadata: {
        applies_to_plan: applies_to,
      }
    };

    if (type === 'percentage') {
      if (!percent_off || percent_off < 1 || percent_off > 100) {
        return { success: false, error: "Percentage discount must be between 1% and 100%." };
      }
      couponParams.percent_off = percent_off;
    } else { 
      if (!amount_off || amount_off <= 0) {
        return { success: false, error: "Fixed amount must be a positive number." };
      }
      couponParams.amount_off = amount_off * 100; // Stripe expects cents
      couponParams.currency = 'usd'; 
    }

    if (duration === "repeating" && (!duration_in_months || duration_in_months <= 0)) {
      return { success: false, error: "Duration in months is required for repeating duration." };
    }
    
    if (duration === "repeating") {
      couponParams.duration_in_months = duration_in_months;
    }
    
    const coupon = await stripe.coupons.create(couponParams);
    
    await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: code,
    });
    
    revalidatePath('/admin-portal/coupons');
    return { success: true };

  } catch (error: any) {
    console.error("Failed to create coupon:", error);
    return { success: false, error: error.raw?.message || error.message || "An unknown error occurred while creating the coupon." };
  }
}

const updateCouponSchema = z.object({
    name: z.string().min(1, "Coupon name cannot be empty."),
    applies_to: z.enum(['any', 'monthly', 'yearly']).default('any'),
});


export async function updateCoupon(couponId: string, formData: FormData): Promise<{ success: boolean; error?: string }> {
    const validatedFields = updateCouponSchema.safeParse({
        name: formData.get('name'),
        applies_to: formData.get('applies_to'),
    });

    if (!validatedFields.success) {
        return { success: false, error: "Invalid form data for update." };
    }
    
    const { name, applies_to } = validatedFields.data;
    
    try {
        const updateParams: Stripe.CouponUpdateParams = {
            name: name,
            metadata: {
                applies_to_plan: applies_to,
            }
        };

        await stripe.coupons.update(couponId, updateParams);
        revalidatePath('/admin-portal/coupons');
        return { success: true };
    } catch (error: any) {
        console.error("Failed to update coupon:", error);
        return { success: false, error: error.message };
    }
}


export async function deleteCoupon(couponId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // First, find and deactivate the promotion code associated with the coupon.
    const promoCodes = await stripe.promotionCodes.list({ coupon: couponId, active: true });
    for (const promoCode of promoCodes.data) {
      await stripe.promotionCodes.update(promoCode.id, { active: false });
    }
    
    // Then, delete the coupon itself.
    await stripe.coupons.del(couponId);

    revalidatePath('/admin-portal/coupons');
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete coupon:", error);
    return { success: false, error: error.raw?.message || error.message };
  }
}
