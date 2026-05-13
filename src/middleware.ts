import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Rule 1: Admin Protection (Existing logic)
  if (pathname.startsWith('/admin-portal') || pathname === '/admin-login') {
    const isAdmin = session?.user?.email === 'wahajmansoorcom@gmail.com' || session?.user?.email === 'wahajmansoor@gmail.com';
    
    if (pathname === '/admin-login' && isAdmin) {
      return NextResponse.redirect(new URL('/admin-portal', req.url));
    }
    if (pathname.startsWith('/admin-portal') && !isAdmin) {
      return NextResponse.redirect(new URL('/admin-login', req.url));
    }
  }

  // Rule 2: Concurrent Session Guard for Dashboard
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/profile')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // This is the CRITICAL check for concurrent sessions
    // We check the DB to see if the current session ID is still valid
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user?.id },
      select: { currentSessionId: true }
    });

    const tokenSessionId = (session as any).sessionId || (req.auth as any).token?.sessionId;
    
    if (dbUser && dbUser.currentSessionId && (session as any).sessionId !== dbUser.currentSessionId) {
      console.log(`MIDDLEWARE_LOCK: Session mismatch for ${session.user?.email}. Redirecting to login.`);
      // Sign out and redirect with error
      const url = new URL('/login', req.url);
      url.searchParams.set('error', 'ConcurrentLogin');
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/admin-login', '/admin-portal/:path*', '/dashboard/:path*', '/profile/:path*'],
};
