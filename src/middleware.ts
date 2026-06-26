import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";
import { isAdmin as checkAdmin } from "./lib/utils";

const { auth } = NextAuth(authConfig);

// Admin IP allowlist (empty = all IPs allowed)
const ADMIN_ALLOWED_IPS = process.env.ADMIN_ALLOWED_IPS?.split(',').filter(Boolean) || [];

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const adminCookie = req.cookies.get('admin-session');
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || req.headers.get('x-real-ip') 
    || 'unknown';

  // Rule 0: HTTPS Enforcement in Production
  if (process.env.NODE_ENV === 'production' && req.nextUrl.protocol === 'http:') {
    const httpsUrl = req.nextUrl.clone();
    httpsUrl.protocol = 'https:';
    return NextResponse.redirect(httpsUrl);
  }

  // Rule 1: Admin IP Allowlist (if configured)
  if (pathname.startsWith('/admin-portal') && ADMIN_ALLOWED_IPS.length > 0) {
    if (!ADMIN_ALLOWED_IPS.includes(clientIp)) {
      console.warn(`Admin access denied for IP: ${clientIp}`);
      return NextResponse.redirect(new URL('/admin-login', req.url));
    }
  }

  // Rule 2: Admin Protection
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

// Rule 3: Basic Dashboard Protection
  const isProtectedPath = pathname.startsWith('/dashboard') || pathname.startsWith('/profile') || pathname.startsWith('/pricing') || pathname.startsWith('/proposals') || pathname.startsWith('/skill-profiles') || pathname.startsWith('/create-proposal') || pathname.startsWith('/subscription');
  const isAuthPath = pathname.startsWith('/forgot-password') || pathname.startsWith('/new-password') || pathname.startsWith('/login');

  // Allow /login page for unauthenticated users (prevents redirect loops after logout)
  if (pathname === '/login') {
    if (!session) {
      return NextResponse.next(); //Stay on login if not logged in
    }
    // If logged in and accessing /login, redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (isProtectedPath && !isAuthPath) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    // Note: Deactivated users are already blocked in auth.ts session callback (returns null)
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
