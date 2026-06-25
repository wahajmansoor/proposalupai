import prisma from '../src/lib/prisma';

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      subscriptionStatus: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      subscriptionCurrentPeriodEnd: true,
    }
  });
  console.log("Users in DB:", JSON.stringify(users, null, 2));
}

main().catch(console.error);
