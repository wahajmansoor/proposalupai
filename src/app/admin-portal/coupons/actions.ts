
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
  code: z
  .string()
  .min(1, "Promotion code is required.")
  .regex(/^[A-Z0-9_%-]+$/, "Code can only contain uppercase letters, numbers, hyphens (-), underscores (_), and percent signs (%).")
  .transform((val) => val.toUpperCase()),
  type: z.enum(['percentage', 'fixed']),
  percent_off: z.string().optional(),
  amount_off: z.string().optional(),
  duration: z.enum(['once', 'repeating', 'forever']),
  duration_in_months: z.string().optional(),
  applies_to: z.enum(['any', 'monthly', 'yearly']).default('any'),
  max_redemptions: z.string().optional(),
  redeem_by: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.type === 'percentage') {
        const percent = Number(data.percent_off);
        if (!data.percent_off || isNaN(percent) || percent <= 0 || percent > 100) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Percentage must be a number between 1 and 100.",
                path: ["percent_off"],
            });
        }
    }
    if (data.type === 'fixed') {
        const amount = Number(data.amount_off);
        if (!data.amount_off || isNaN(amount) || amount <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Amount must be a positive number.",
                path: ["amount_off"],
            });
        }
    }
    if (data.duration === 'repeating') {
        const months = Number(data.duration_in_months);
        if (!data.duration_in_months || isNaN(months) || months <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Duration must be a positive number of months.",
                path: ["duration_in_months"],
            });
        }
    }
});


export async function getCoupons(): Promise<CouponWithPromotionCode[]> {
  try {
    const [coupons, promoCodes] = await Promise.all([
        stripe.coupons.list({ limit: 100 }),
        stripe.promotionCodes.list({ limit: 100, active: true })
    ]);

    const promoCodeMap = new Map<string, string>();
    promoCodes.data.forEach(promo => {
        // A coupon can have multiple promo codes, we'll just show the first one we find.
        if (promo.coupon.id && !promoCodeMap.has(promo.coupon.id)) {
            promoCodeMap.set(promo.coupon.id, promo.code);
        }
    });

    const couponsWithCodes = coupons.data.map(coupon => {
      return {
        ...coupon,
        promotion_code: promoCodeMap.get(coupon.id) || coupon.name || 'N/A',
      };
    });

    couponsWithCodes.sort((a, b) => (b.created || 0) - (a.created || 0));

    return couponsWithCodes;

  } catch (error: any) {
    console.error("Failed to fetch coupons from Stripe:", error);
    throw new Error(`Failed to fetch coupons: ${error.message}`);
  }
}

export async function createCoupon(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const data = Object.fromEntries(formData.entries());
  
  const validatedFields = couponFormSchema.safeParse(data);

  if (!validatedFields.success) {
    const error = validatedFields.error.flatten().fieldErrors;
    const firstError = Object.values(error)[0]?.[0];
    return { success: false, error: firstError || "Invalid form data." };
  }
  
  const { code, type, duration, applies_to } = validatedFields.data;
  const percent_off = validatedFields.data.percent_off ? Number(validatedFields.data.percent_off) : undefined;
  const amount_off = validatedFields.data.amount_off ? Number(validatedFields.data.amount_off) : undefined;
  const duration_in_months = validatedFields.data.duration_in_months ? Number(validatedFields.data.duration_in_months) : undefined;
  const max_redemptions = validatedFields.data.max_redemptions ? Number(validatedFields.data.max_redemptions) : undefined;
  const redeem_by = validatedFields.data.redeem_by ? Math.floor(new Date(validatedFields.data.redeem_by).getTime() / 1000) : undefined;


  let createdCouponId: string | null = null;
  try {
    const couponParams: Stripe.CouponCreateParams = {
      name: code,
      duration,
      metadata: {
        applies_to_plan: applies_to,
      }
    };

    if (type === 'percentage' && percent_off) {
      couponParams.percent_off = percent_off;
    } else if (type === 'fixed' && amount_off){ 
      couponParams.amount_off = amount_off * 100;
      couponParams.currency = 'usd'; 
    }

    if (duration === "repeating" && duration_in_months) {
      couponParams.duration_in_months = duration_in_months;
    }

    if (max_redemptions) {
        couponParams.max_redemptions = max_redemptions;
    }

    if (redeem_by) {
        couponParams.redeem_by = redeem_by;
    }
    
    const coupon = await stripe.coupons.create(couponParams);
    createdCouponId = coupon.id;

    await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: code,
    });
    
    revalidatePath('/admin-portal/coupons');
    return { success: true };

  } catch (error: any) {
    console.error("Failed to create coupon or promotion code:", error);
    
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
    const promoCodes = await stripe.promotionCodes.list({ coupon: couponId, active: true });
    for (const promoCode of promoCodes.data) {
      await stripe.promotionCodes.update(promoCode.id, { active: false });
    }
    
    await stripe.coupons.del(couponId);

    revalidatePath('/admin-portal/coupons');
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete coupon:", error);
    return { success: false, error: error.raw?.message || error.message };
  }
}
