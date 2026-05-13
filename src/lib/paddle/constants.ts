
// Paddle Price IDs (using NEXT_PUBLIC_ for client-side availability)
export const PADDLE_PRICES = {
  monthly: process.env.NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID || 'pri_placeholder_monthly',
  yearly:  process.env.NEXT_PUBLIC_PADDLE_YEARLY_PRICE_ID  || 'pri_placeholder_yearly',
  credits: {
    ten:    process.env.NEXT_PUBLIC_PADDLE_CREDITS_10_PRICE_ID || 'pri_placeholder_credits_10',
    twentyfive: process.env.NEXT_PUBLIC_PADDLE_CREDITS_25_PRICE_ID || 'pri_placeholder_credits_25',
    fifty:  process.env.NEXT_PUBLIC_PADDLE_CREDITS_50_PRICE_ID || 'pri_placeholder_credits_50',
  },
} as const;

export const CREDIT_AMOUNTS: Record<string, number> = {
  [PADDLE_PRICES.credits.ten]: 30,
  [PADDLE_PRICES.credits.twentyfive]: 70,
  [PADDLE_PRICES.credits.fifty]: 200,
};
