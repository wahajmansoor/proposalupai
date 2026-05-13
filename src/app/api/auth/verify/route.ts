
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  if (!token || !email) {
    return new NextResponse("Missing token or email", { status: 400 });
  }

  try {
    // 1. Check if user is already verified
    const user = await prisma.user.findUnique({
      where: { email },
      select: { emailVerified: true }
    });

    if (user?.emailVerified) {
      return NextResponse.redirect(new URL("/dashboard?verified=true", req.url));
    }

    // 2. Find the verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: {
        token: token,
      },
    });

    if (!verificationToken || verificationToken.identifier !== email) {
      return new NextResponse("Invalid or expired token. Please request a new one from your dashboard.", { status: 400 });
    }

    // 3. Check if expired
    if (new Date() > verificationToken.expires) {
      await prisma.verificationToken.delete({
        where: { token },
      });
      return new NextResponse("This verification link has expired. Please request a new one.", { status: 400 });
    }

    // 3. Mark user as verified
    await prisma.user.update({
      where: { email },
      data: {
        emailVerified: new Date(),
      },
    });

    // 4. Delete the token
    await prisma.verificationToken.delete({
      where: { token },
    });

    // 5. Redirect to dashboard with success message
    return NextResponse.redirect(new URL("/dashboard?verified=true", req.url));
  } catch (error) {
    console.error("VERIFY_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
