
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_SESSION_COOKIE = 'admin-session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

  // Check if the requested path is within the admin portal
  if (pathname.startsWith('/admin-portal')) {
    const isLoginPage = pathname === '/admin-portal/login';

    // If on the login page, do nothing special.
    // Let the page render, regardless of session status.
    if (isLoginPage) {
      return NextResponse.next();
    }

    // For any OTHER admin page, check for a valid session.
    // If there is no session cookie, redirect to the login page.
    if (!sessionCookie) {
      const loginUrl = new URL('/admin-portal/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // For all non-admin routes, do nothing.
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: ['/admin-portal/:path*'],
};
