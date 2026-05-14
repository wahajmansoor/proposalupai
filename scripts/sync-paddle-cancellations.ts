import { paddle } from '../src/lib/paddle/config';
import prisma from '../src/lib/prisma';

async function main() {
    console.log("Fetching active users with Paddle subscriptions...");
    const users = await prisma.user.findMany({
        where: {
            subscriptionStatus: 'active',
            paddleSubscriptionId: { not: null }
        }
    });
    
    console.log(`Found ${users.length} active users.`);
    let updatedCount = 0;
    
    for (const user of users) {
        if (!user.paddleSubscriptionId) continue;
        
        try {
            const sub = await paddle.subscriptions.get(user.paddleSubscriptionId);
            if (sub.scheduledChange && sub.scheduledChange.action === 'cancel') {
                console.log(`\nUser ${user.email} is scheduled to cancel on ${sub.scheduledChange.effectiveAt}`);
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        scheduledCancelAt: new Date(sub.scheduledChange.effectiveAt)
                    }
                });
                console.log(`✅ Updated user ${user.email} with scheduledCancelAt.`);
                updatedCount++;
            }
        } catch (e: any) {
            console.error(`Error syncing user ${user.email}:`, e.message);
        }
    }
    
    console.log(`\nDone syncing. Updated ${updatedCount} users.`);
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
