
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'your-super-secret-jwt-key-for-admin';
const ADMIN_SESSION_COOKIE = 'admin-session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Define all admin routes that need protection
  const adminRoutes = ['/admin-portal/users', '/admin-portal'];

  // Check if the current route is one of the protected admin routes
  const isProtectedRoute = adminRoutes.includes(pathname);

  if (isProtectedRoute) {
    const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

    if (!sessionCookie) {
      // If no cookie, redirect to the admin login page
      return NextResponse.redirect(new URL('/admin-portal/login', request.url));
    }

    try {
      // Verify the JWT token
      // Using a promise wrapper for the callback-style verify function
      await new Promise((resolve, reject) => {
          verify(sessionCookie, JWT_SECRET, {}, (err, decoded) => {
              if (err) return reject(err);
              resolve(decoded);
          });
      });

      // If token is valid, let the request proceed
      return NextResponse.next();
    } catch (error) {
      // If token is invalid (expired, tampered, etc.), redirect to login
      const response = NextResponse.redirect(new URL('/admin-portal/login', request.url));
      // Clear the invalid cookie
      response.cookies.delete(ADMIN_SESSION_COOKIE);
      return response;
    }
  }

  // Allow all other requests to proceed
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
