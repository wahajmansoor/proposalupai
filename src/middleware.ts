
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/firebase/server-auth';

async function isAdmin(user: any): Promise<boolean> {
    if (!user?.userDoc) {
        return false;
    }
    // Check for the isAdmin flag in the user's Firestore document
    return user.userDoc.isAdmin === true;
}


export async function middleware(request: NextRequest) {
  const currentUser = await getCurrentUser();

  if (request.nextUrl.pathname.startsWith('/adminpro')) {
    if (!currentUser) {
      // Not logged in, redirect to login
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const userIsAdmin = await isAdmin(currentUser);
    if (!userIsAdmin) {
      // Not an admin, redirect to the main dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/adminpro/:path*'],
};
