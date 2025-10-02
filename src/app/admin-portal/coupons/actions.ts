
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

    return promoCodes.data.map(promoCode => {
        const coupon = promoCode.coupon as Stripe.Coupon;
        return {
            ...coupon,
            promotion_code: promoCode.code,
        };
    });
  } catch (error: any) {
    console.error("Failed to fetch coupons from Stripe:", error);
    throw new Error(`Failed to fetch coupons: ${error.message}`);
  }
}

const couponSchema = z.object({
  code: z.string().min(1, "Coupon code is required."),
  name: z.string().min(1, "Coupon name is required."),
  type: z.enum(['percentage', 'fixed']),
  percent_off: z.coerce.number().optional(),
  amount_off: z.coerce.number().optional(),
  duration: z.enum(["once", "repeating", "forever"]),
  duration_in_months: z.coerce.number().optional(),
  applies_to: z.enum(['any', 'monthly', 'yearly']).default('any'),
});

export async function createCoupon(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const validatedFields = couponSchema.safeParse({
    code: formData.get('code'),
    name: formData.get('name'),
    type: formData.get('type'),
    percent_off: formData.get('percent_off'),
    amount_off: formData.get('amount_off'),
    duration: formData.get('duration'),
    duration_in_months: formData.get('duration_in_months'),
    applies_to: formData.get('applies_to'),
  });

  if (!validatedFields.success) {
    return { success: false, error: "Invalid form data." };
  }

  const { code, name, type, percent_off, amount_off, duration, duration_in_months, applies_to } = validatedFields.data;

  try {
    const couponParams: Stripe.CouponCreateParams = {
      name: name,
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
    } else { // Fixed amount
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
    
    // Create a promotion code for the coupon
    await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: code,
    });

    revalidatePath('/admin-portal/coupons');
    return { success: true };
  } catch (error: any) {
    console.error("Failed to create coupon:", error);
    return { success: false, error: error.message };
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
    // In Stripe, deleting a coupon automatically deactivates associated promotion codes.
    await stripe.coupons.update(couponId, { active: false });
    revalidatePath('/admin-portal/coupons');
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete coupon:", error);
    return { success: false, error: error.message };
  }
}
