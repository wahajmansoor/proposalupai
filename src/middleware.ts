
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'your-super-secret-jwt-key-for-admin';
const ADMIN_SESSION_COOKIE = 'admin-session';

async function verifyJWT(token: string) {
    const secret = new TextEncoder().encode(JWT_SECRET);
    try {
        await jwtVerify(token, secret);
        return true;
    } catch (error) {
        return false;
    }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

  // Only apply admin protection logic to routes under /admin-portal
  if (pathname.startsWith('/admin-portal')) {
    
    // If the request is for the admin login page, do nothing. Let it pass.
    if (pathname === '/admin-portal/login') {
      return NextResponse.next();
    }

    // For any other page under /admin-portal, a valid session is required.
    const hasVerifiedSession = sessionCookie && (await verifyJWT(sessionCookie));

    if (!hasVerifiedSession) {
      // If no valid session, redirect to the admin login page.
      const loginUrl = new URL('/admin-portal/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      // Clear the invalid cookie just in case.
      response.cookies.delete(ADMIN_SESSION_COOKIE);
      return response;
    }
  }

  // Allow all other non-admin requests to proceed
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
