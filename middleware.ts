import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  console.log('[Middleware] Processing request:', request.nextUrl.pathname);
  console.log('[Middleware] NODE_ENV:', process.env.NODE_ENV);
  
  // 開発環境では認証をスキップ
  if (process.env.NODE_ENV === 'development') {
    console.log('[Middleware] Skipping auth in development');
    return NextResponse.next();
  }

  // Basic認証の設定値を取得
  const basicAuthUser = process.env.BASIC_AUTH_USER;
  const basicAuthPassword = process.env.BASIC_AUTH_PASSWORD;
  
  console.log('[Middleware] Basic auth user exists:', !!basicAuthUser);
  console.log('[Middleware] Basic auth password exists:', !!basicAuthPassword);

  // Basic認証が設定されていない場合はスキップ
  if (!basicAuthUser || !basicAuthPassword) {
    console.log('[Middleware] Basic auth not configured, skipping');
    return NextResponse.next();
  }

  // APIルートやStatic filesは除外
  if (
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/favicon.ico') ||
    request.nextUrl.pathname.includes('.')
  ) {
    console.log('[Middleware] Skipping auth for excluded path:', request.nextUrl.pathname);
    return NextResponse.next();
  }

  console.log('[Middleware] Checking Basic auth for path:', request.nextUrl.pathname);

  // Basic認証のヘッダーを確認
  const authHeader = request.headers.get('authorization');
  
  console.log('[Middleware] Auth header exists:', !!authHeader);
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    console.log('[Middleware] No valid auth header, requiring authentication');
    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Nippo App"',
      },
    });
  }

  // Base64デコードして認証情報を取得
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  // 認証情報を検証
  console.log('[Middleware] Validating credentials for user:', username);
  
  if (username !== basicAuthUser || password !== basicAuthPassword) {
    console.log('[Middleware] Invalid credentials');
    return new NextResponse('Invalid credentials', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Nippo App"',
      },
    });
  }

  console.log('[Middleware] Authentication successful');
  // 認証成功時は次の処理に進む
  return NextResponse.next();
}

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
