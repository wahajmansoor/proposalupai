
'use server';

import { z } from 'zod';
import { stripe } from '@/lib/stripe/config';

const createStripeCustomerSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  firebaseUID: z.string(),
});

export async function createStripeCustomer(input: z.infer<typeof createStripeCustomerSchema>): Promise<{ customerId?: string, error?: string }> {
  const validatedFields = createStripeCustomerSchema.safeParse(input);
  if (!validatedFields.success) {
    return { error: 'Invalid input for creating Stripe customer.' };
  }
  
  const { email, name, firebaseUID } = validatedFields.data;

  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: { firebaseUID },
    });
    return { customerId: customer.id };
  } catch (error: any) {
    console.error("Error creating Stripe customer:", error);
    return { error: "Failed to create customer in our payment system." };
  }
}
