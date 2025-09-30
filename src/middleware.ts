
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminSession } from '@/app/login/actions';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If user is logged in and tries to access /login page, redirect to admin dashboard
  if (pathname === '/login') {
    const session = await getAdminSession();
    if (session) {
      return NextResponse.redirect(new URL('/admin-portal', request.url));
    }
    return NextResponse.next();
  }

  // For any page inside /admin-portal, check for a session
  if (pathname.startsWith('/admin-portal')) {
    const session = await getAdminSession();
    if (!session) {
      // Redirect them to the new /login page
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

// Apply middleware to both /login and /admin-portal paths
export const config = {
  matcher: ['/login', '/admin-portal/:path*'],
};
