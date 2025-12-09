/**
 * NextAuth.js Middleware
 * 集計機能と管理画面へのアクセス制御
 */
import { auth } from '@/lib/auth/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;

  // 集計機能へのアクセス制御
  if (pathname.startsWith('/aggregation')) {
    if (!isLoggedIn) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // admin または manager のみアクセス可能
    if (userRole !== 'admin' && userRole !== 'manager') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // 管理画面へのアクセス制御
  if (pathname.startsWith('/admin')) {
    if (!isLoggedIn) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // admin または manager のみアクセス可能
    if (userRole !== 'admin' && userRole !== 'manager') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/aggregation/:path*',
    '/admin/:path*',
  ],
};

