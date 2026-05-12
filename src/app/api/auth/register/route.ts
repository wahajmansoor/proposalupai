import { NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, password, name, referralCode } = await req.json();

    if (!email || !password || !name) {
      return new NextResponse("Missing fields", { status: 400 });
    }

    const exist = await prisma.user.findUnique({
      where: { email }
    });

    if (exist) {
      return new NextResponse("Email already exists", { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a short unique referral code for the new user
    const userReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        subscriptionStatus: "trialing",
        subscriptionCurrentPeriodEnd: trialEndDate,
        proposalCount: 0,
        proposalCredits: 5,
        referralCode: userReferralCode,
        referredBy: referralCode || null,
      }
    });

    // Log the welcome bonus in credit history
    // @ts-ignore
    await prisma.creditHistory.create({
      data: {
        userId: user.id,
        amount: 5,
        reason: 'Welcome Bonus',
      }
    });

    // If user was referred, reward BOTH users with 5 bonus credits
    if (referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: referralCode }
      });

      if (referrer && referrer.id !== user.id) {
        // Reward the referrer (+5 for every successful referral)
        await prisma.user.update({
          where: { id: referrer.id },
          data: { proposalCredits: { increment: 5 } }
        });
        // @ts-ignore
        await prisma.creditHistory.create({
          data: {
            userId: referrer.id,
            amount: 5,
            reason: `Referral Bonus – ${name} signed up with your link`,
          }
        });

        // Reward the new user too (+5 for joining via invite)
        await prisma.user.update({
          where: { id: user.id },
          data: { proposalCredits: { increment: 5 } }
        });
        // @ts-ignore
        await prisma.creditHistory.create({
          data: {
            userId: user.id,
            amount: 5,
            reason: 'Referral Bonus – you joined via an invite link',
          }
        });
      }
    }

    return NextResponse.json(user);
  } catch (error: any) {
    console.error("REGISTER_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
