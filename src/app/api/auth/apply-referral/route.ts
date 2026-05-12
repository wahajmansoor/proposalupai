import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { referralCode } = await req.json();
    if (!referralCode || typeof referralCode !== 'string') {
      return new NextResponse("Missing referral code", { status: 400 });
    }

    const userId = session.user.id;

    // Check if this user was already referred (idempotent)
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { referredBy: true }
    });

    if (currentUser?.referredBy) {
      return NextResponse.json({ message: 'Already applied' });
    }

    // Find the referrer by their referral code
    const referrer = await prisma.user.findUnique({
      where: { referralCode }
    });

    if (!referrer || referrer.id === userId) {
      return new NextResponse("Invalid referral code", { status: 400 });
    }

    // Save referredBy on the new user
    await prisma.user.update({
      where: { id: userId },
      data: { referredBy: referralCode }
    });

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
        reason: `Referral Bonus – new user signed up with your link`,
      }
    });

    // Reward the new user too (+5 for joining via invite)
    await prisma.user.update({
      where: { id: userId },
      data: { proposalCredits: { increment: 5 } }
    });

    // @ts-ignore
    await prisma.creditHistory.create({
      data: {
        userId: userId,
        amount: 5,
        reason: 'Referral Bonus – you joined via an invite link',
      }
    });

    return NextResponse.json({ message: 'Referral applied successfully' });
  } catch (error: any) {
    console.error("APPLY_REFERRAL_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
