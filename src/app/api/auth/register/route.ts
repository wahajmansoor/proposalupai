import { NextResponse } from "next/server";
import { headers } from "next/headers";
import * as bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email: rawEmail, password, name, referralCode } = await req.json();
    const email = rawEmail?.toLowerCase();

    if (!email || !password || !name) {
      return new NextResponse("Missing fields", { status: 400 });
    }

    const exist = await prisma.user.findUnique({
      where: { email }
    });

    if (exist) {
      return new NextResponse("Email already exists", { status: 400 });
    }

    const domain = email.split('@')[1];
    const DISPOSABLE_DOMAINS = [
      'temp-mail.org', 'guerrillamail.com', 'mailinator.com', '10minutemail.com',
      'throwawaymail.com', 'getnada.com', 'tempmail.com', 'yopmail.com',
      'sharklasers.com', 'guerrillamailblock.com', 'pokemail.net', 'spam4.me',
      'maildrop.cc', 'dispostable.com', 'mailexpire.com', 'mailforspam.com',
      'mytrashmail.com', 'spambox.us', 'tempemail.co', 'temp-mail.io',
      'tempmail.net', 'tempmail.dev', 'tempmail.biz', 'dropmail.me',
      'minuteinbox.com', '10minutemail.net', 'temp-mail.com', 'tempmail.host',
      'tempmail.email', 'tempmail.ninja', 'tempmail.pro', 'tempmail.plus',
      'internxt.com', 'protonmail.com', 'tutanota.com', 'tutanota.de',
      'disroot.org', 'cock.li', 'mail.tm', 'mail.gw', 'secmail.pro',
      'disposable.com', 'tempmail.id', 'tempmail.ooo', 'tempmail.site',
      'tempmail.top', 'tempmail.win', 'tempmail.xyz', 'tempmail.icu'
    ];

    if (DISPOSABLE_DOMAINS.includes(domain) || domain.includes('temp-mail')) {
      return new NextResponse("Temporary email addresses are not allowed. Please use a permanent email address.", { status: 400 });
    }

    // BASIC IP RATE LIMITING (Optional: store IP in User table to enforce strictly)
    // For now, we just proceed, but we could block if needed.

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a short unique referral code for the new user
    const userReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7);

    // Get IP for anti-abuse
    const headersList = await headers();
    const registrationIp = headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip') || 'unknown';

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
        registrationIp,
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
        // Reward the referrer (+10 for every successful referral)
        await prisma.user.update({
          where: { id: referrer.id },
          data: { proposalCredits: { increment: 10 } }
        });
        // @ts-ignore
        await prisma.creditHistory.create({
          data: {
            userId: referrer.id,
            amount: 10,
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

    // GENERATE VERIFICATION TOKEN
    const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: verificationToken,
        expires,
      }
    });

    // SEND VERIFICATION EMAIL & ADMIN NOTIFICATION
    const { sendVerificationEmail, sendAdminNotificationEmail } = await import("@/lib/email-actions");
    await Promise.all([
      sendVerificationEmail(email, verificationToken),
      sendAdminNotificationEmail({ name, email })
    ]);

    return NextResponse.json({
      ...user,
      message: "Verification email sent. Please check your inbox."
    });
  } catch (error: any) {
    console.error("REGISTER_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
