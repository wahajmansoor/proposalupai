
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
    // 1. Find the verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: {
        token: token,
      },
    });

    if (!verificationToken || verificationToken.identifier !== email) {
      return new NextResponse("Invalid or expired token", { status: 400 });
    }

    // 2. Check if expired
    if (new Date() > verificationToken.expires) {
      await prisma.verificationToken.delete({
        where: { token },
      });
      return new NextResponse("Token has expired", { status: 400 });
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
