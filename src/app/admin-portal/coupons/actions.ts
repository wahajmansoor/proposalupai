
"use server";

import { stripe } from "@/lib/stripe/config";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type Stripe from "stripe";

export async function getCoupons(): Promise<Stripe.Coupon[]> {
  try {
    const coupons = await stripe.coupons.list({ limit: 100 });
    return coupons.data;
  } catch (error: any) {
    console.error("Failed to fetch coupons from Stripe:", error);
    throw new Error(`Failed to fetch coupons: ${error.message}`);
  }
}

const couponSchema = z.object({
  percent_off: z.coerce.number().min(1, "Discount must be at least 1%").max(100, "Discount cannot exceed 100%"),
  duration: z.enum(["once", "repeating", "forever"]),
  duration_in_months: z.coerce.number().optional(),
  name: z.string().optional(),
});

export async function createCoupon(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const validatedFields = couponSchema.safeParse({
    percent_off: formData.get('percent_off'),
    duration: formData.get('duration'),
    duration_in_months: formData.get('duration_in_months'),
    name: formData.get('name'),
  });

  if (!validatedFields.success) {
    return { success: false, error: validatedFields.error.flatten().fieldErrors.percent_off?.[0] };
  }

  const { percent_off, duration, duration_in_months, name } = validatedFields.data;

  if (duration === "repeating" && (!duration_in_months || duration_in_months <= 0)) {
    return { success: false, error: "Duration in months is required for repeating duration." };
  }

  try {
    const couponParams: Stripe.CouponCreateParams = {
      percent_off,
      duration,
      name: name || `${percent_off}% off`
    };

    if (duration === "repeating") {
      couponParams.duration_in_months = duration_in_months;
    }
    
    await stripe.coupons.create(couponParams);

    revalidatePath('/admin-portal/coupons');
    return { success: true };
  } catch (error: any) {
    console.error("Failed to create coupon:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteCoupon(couponId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await stripe.coupons.del(couponId);
    revalidatePath('/admin-portal/coupons');
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete coupon:", error);
    return { success: false, error: error.message };
  }
}
