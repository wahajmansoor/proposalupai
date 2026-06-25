import fs from 'fs';
import path from 'path';

// Parse .env file manually first
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      const key = parts[0]?.trim();
      let value = parts.slice(1).join('=').trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      if (key) {
        process.env[key] = value;
      }
    }
  });
}

import prisma from '../src/lib/prisma';
import { stripe } from '../src/lib/stripe';

async function main() {
  const userId = "cmqtnmyqq0000berhi1wjenu4"; // jani@gmail.com
  console.log("Simulating sync for user ID:", userId);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.stripeCustomerId) {
      console.log('No user or stripe customer ID found');
      return;
    }

    console.log("User's stripeCustomerId:", user.stripeCustomerId);

    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'all',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      console.log('No subscriptions found in Stripe.');
      return;
    }

    const subscription = subscriptions.data[0];
    console.log("Subscription status in Stripe:", subscription.status);

    const periodEndRaw = (subscription as any).current_period_end 
      || subscription.items.data[0]?.current_period_end 
      || (Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60);
    const periodEndDate = new Date(periodEndRaw * 1000);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        stripePriceId: subscription.items.data[0].price.id,
        subscriptionCurrentPeriodEnd: periodEndDate,
        subscriptionInterval: subscription.items.data[0].plan.interval,
      },
    });

    console.log("Updated user in DB successfully:", JSON.stringify(updatedUser, null, 2));
  } catch (error) {
    console.error("Error during simulation:", error);
  }
}

main().catch(console.error);
