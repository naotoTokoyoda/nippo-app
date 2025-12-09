/**
 * NextAuth.js Middleware
 * 全ページにNextAuth認証を必須化
 */
import { auth } from '@/lib/auth/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;

  // ログインページはスキップ
  if (pathname === '/login') {
    // ログイン済みならホームにリダイレクト
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // 未ログインの場合はログインページにリダイレクト
  if (!isLoggedIn) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 集計機能へのアクセス制御（admin / manager のみ）
  if (pathname.startsWith('/aggregation')) {
    if (userRole !== 'admin' && userRole !== 'manager') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // 管理画面へのアクセス制御（admin / manager のみ）
  if (pathname.startsWith('/admin')) {
    if (userRole !== 'admin' && userRole !== 'manager') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * 以下を除くすべてのパスにマッチ:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
};
