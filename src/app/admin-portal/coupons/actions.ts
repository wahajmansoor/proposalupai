
"use server";

import { stripe } from "@/lib/stripe/config";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type Stripe from "stripe";

export interface CouponWithPromotionCode extends Stripe.Coupon {
    promotion_code: string;
}

// Schema for form validation
const couponFormSchema = z.object({
  code: z.string().min(1, "Promotion code is required."),
  type: z.enum(['percentage', 'fixed']),
  percent_off: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number({ invalid_type_error: "Percentage must be a number." }).min(1, "Percentage must be at least 1.").max(100, "Percentage cannot exceed 100.").optional()
  ),
  amount_off: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number({ invalid_type_error: "Amount must be a number." }).positive("Amount must be a positive number.").optional()
  ),
  duration: z.enum(['once', 'repeating', 'forever']),
  duration_in_months: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number({ invalid_type_error: "Duration must be a number." }).positive().int().optional()
  ),
  applies_to: z.enum(['any', 'monthly', 'yearly']).default('any')
}).refine(data => {
  if (data.type === 'percentage') return data.percent_off !== undefined;
  return true;
}, {
  message: "Percentage is required for percentage-type coupons.",
  path: ["percent_off"],
}).refine(data => {
  if (data.type === 'fixed') return data.amount_off !== undefined;
  return true;
}, {
  message: "Amount is required for fixed-amount coupons.",
  path: ["amount_off"],
}).refine(data => {
    if (data.duration === 'repeating') return data.duration_in_months !== undefined;
    return true;
}, {
  message: "Duration in months is required for repeating coupons.",
  path: ["duration_in_months"],
});


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
  const data = Object.fromEntries(formData.entries());
  
  const validatedFields = couponFormSchema.safeParse(data);

  if (!validatedFields.success) {
    // Return a user-friendly error message from Zod's flattened errors.
    const error = validatedFields.error.flatten().fieldErrors;
    const firstError = Object.values(error)[0]?.[0];
    return { success: false, error: firstError || "Invalid form data." };
  }
  
  const { code, type, percent_off, amount_off, duration, duration_in_months, applies_to } = validatedFields.data;

  let createdCouponId: string | null = null;
  try {
    // Step 1: Create the Coupon object
    const couponParams: Stripe.CouponCreateParams = {
      name: code, // Use the code as the internal name for simplicity
      duration,
      metadata: {
        applies_to_plan: applies_to,
      }
    };

    if (type === 'percentage' && percent_off) {
      couponParams.percent_off = percent_off;
    } else if (type === 'fixed' && amount_off){ 
      couponParams.amount_off = amount_off * 100; // Stripe expects cents
      couponParams.currency = 'usd'; 
    }

    if (duration === "repeating" && duration_in_months) {
      couponParams.duration_in_months = duration_in_months;
    }
    
    const coupon = await stripe.coupons.create(couponParams);
    createdCouponId = coupon.id;

    // Step 2: Create the Promotion Code and associate it with the coupon
    await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: code,
    });
    
    // If both steps succeed, revalidate the path and return success
    revalidatePath('/admin-portal/coupons');
    return { success: true };

  } catch (error: any) {
    // If any step fails, return the error from Stripe's API
    console.error("Failed to create coupon or promotion code:", error);
    
    // Attempt to clean up the orphaned coupon if the promotion code creation failed
    if (createdCouponId) {
      try {
        await stripe.coupons.del(createdCouponId);
        console.log(`Cleaned up orphaned coupon: ${createdCouponId}`);
      } catch (cleanupError: any) {
        console.error(`Failed to clean up orphaned coupon ${createdCouponId}:`, cleanupError);
      }
    }

    return { success: false, error: error.raw?.message || error.message || "An unknown error occurred." };
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
