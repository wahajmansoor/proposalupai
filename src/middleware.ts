import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";
import { isAdmin as checkAdmin } from "./lib/utils";

const { auth } = NextAuth(authConfig);

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const adminCookie = req.cookies.get('admin-session');

  // Rule 1: Admin Protection
  if (pathname.startsWith('/admin-portal') || pathname === '/admin-login') {
    const isNextAuthAdmin = checkAdmin(session?.user?.email);
    const hasAdminCookie = !!adminCookie;
    const isAdmin = isNextAuthAdmin || hasAdminCookie;

    if (pathname === '/admin-login' && isAdmin) {
      return NextResponse.redirect(new URL('/admin-portal', req.url));
    }
    if (pathname.startsWith('/admin-portal') && !isAdmin) {
      return NextResponse.redirect(new URL('/admin-login', req.url));
    }
  }

  // Rule 2: Basic Dashboard Protection
  const isProtectedPath = pathname.startsWith('/dashboard') || pathname.startsWith('/profile');
  const isAuthPath = pathname.startsWith('/forgot-password') || pathname.startsWith('/new-password');

  if (isProtectedPath && !isAuthPath) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Deactivated user check
    if ((session.user as any).deactivated) {
      return NextResponse.redirect(new URL('/login?error=Deactivated', req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/admin-login',
    '/admin-portal/:path*',
    '/dashboard/:path*',
    '/profile/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico|forgot-password|new-password).*)',
  ],
};
