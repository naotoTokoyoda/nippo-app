import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // 開発環境では認証をスキップ
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  // Basic認証の設定値を取得
  const basicAuthUser = process.env.BASIC_AUTH_USER;
  const basicAuthPassword = process.env.BASIC_AUTH_PASSWORD;

  // Basic認証が設定されていない場合はスキップ
  if (!basicAuthUser || !basicAuthPassword) {
    return NextResponse.next();
  }

  // APIルートやStatic filesは除外
  if (
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/favicon.ico') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Basic認証のヘッダーを確認
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
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
  if (username !== basicAuthUser || password !== basicAuthPassword) {
    return new NextResponse('Invalid credentials', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Nippo App"',
      },
    });
  }

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
