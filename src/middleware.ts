
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminSession } from '@/app/admin-portal/login/actions';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Exclude the login page from the session check
  if (pathname === '/admin-portal/login') {
    const session = await getAdminSession();
    // If user is logged in and tries to access login page, redirect to dashboard
    if (session) {
      return NextResponse.redirect(new URL('/admin-portal', request.url));
    }
    return NextResponse.next();
  }

  // For any other admin page, check for a session
  if (pathname.startsWith('/admin-portal')) {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.redirect(new URL('/admin-portal/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin-portal/:path*'],
};
