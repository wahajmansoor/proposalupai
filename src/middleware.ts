
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminSession } from '@/app/login/actions';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rule 1: If user is trying to access the admin login page
  if (pathname === '/admin-login') {
    const session = await getAdminSession();
    // If they are already logged in as an admin, send them to the dashboard
    if (session) {
      return NextResponse.redirect(new URL('/admin-portal', request.url));
    }
    // Otherwise, let them see the login page
    return NextResponse.next();
  }

  // Rule 2: If user is trying to access any page inside /admin-portal
  if (pathname.startsWith('/admin-portal')) {
    const session = await getAdminSession();
    // If they are NOT logged in, redirect them to the admin login page
    if (!session) {
      return NextResponse.redirect(new URL('/admin-login', request.url));
    }
  }

  return NextResponse.next();
}

// Apply this middleware to all admin-related routes
export const config = {
  matcher: ['/admin-login', '/admin-portal/:path*'],
};
