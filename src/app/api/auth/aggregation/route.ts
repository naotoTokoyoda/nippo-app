import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    // 開発環境・Preview環境では認証をスキップ
    if (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview') {
      // 開発環境・Preview環境では常に認証成功として扱う
      const cookieStore = await cookies();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30分後

      cookieStore.set('aggregation_auth', 'authenticated', {
        expires: expiresAt,
        httpOnly: true,
        secure: false, // 開発環境・Preview環境ではfalse
        sameSite: 'strict',
        path: '/',
      });

      return NextResponse.json({ message: '認証成功（開発・Preview環境）' });
    }

    // 集計パスワードを環境変数から取得
    const aggregationPassword = process.env.AGGREGATION_PASSWORD;

    if (!aggregationPassword) {
      return NextResponse.json(
        { message: '集計機能が設定されていません' },
        { status: 500 }
      );
    }

    // パスワード検証
    if (password !== aggregationPassword) {
      return NextResponse.json(
        { message: 'パスワードが正しくありません' },
        { status: 401 }
      );
    }

    // 認証成功時はセッションCookieを設定（30分有効）
    const cookieStore = await cookies();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30分後

    cookieStore.set('aggregation_auth', 'authenticated', {
      expires: expiresAt,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return NextResponse.json({ message: '認証成功' });
  } catch (error) {
    console.error('集計認証エラー:', error);
    return NextResponse.json(
      { message: '認証処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// セッション確認用のGETエンドポイント
export async function GET() {
  try {
    // 開発環境・Preview環境では常に認証済みとして扱う
    if (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview') {
      return NextResponse.json({ authenticated: true });
    }

    const cookieStore = await cookies();
    const authCookie = cookieStore.get('aggregation_auth');

    if (authCookie?.value === 'authenticated') {
      return NextResponse.json({ authenticated: true });
    }

    return NextResponse.json({ authenticated: false });
  } catch (error) {
    console.error('セッション確認エラー:', error);
    return NextResponse.json({ authenticated: false });
  }
}
