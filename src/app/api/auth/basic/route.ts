import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // 開発環境では認証をスキップ
    if (process.env.NODE_ENV === 'development') {
      const cookieStore = await cookies();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24時間

      cookieStore.set('basic_auth', 'authenticated', {
        expires: expiresAt,
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: '/',
      });

      return NextResponse.json({ 
        success: true, 
        message: '認証成功（開発環境）' 
      });
    }

    // Basic認証の設定値を取得
    const basicAuthUser = process.env.BASIC_AUTH_USER;
    const basicAuthPassword = process.env.BASIC_AUTH_PASSWORD;

    if (!basicAuthUser || !basicAuthPassword) {
      return NextResponse.json(
        { success: false, message: 'Basic認証が設定されていません' },
        { status: 500 }
      );
    }

    // 認証情報を検証
    if (username !== basicAuthUser || password !== basicAuthPassword) {
      return NextResponse.json(
        { success: false, message: 'ユーザー名またはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // 認証成功時はセッションCookieを設定（24時間有効）
    const cookieStore = await cookies();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24時間

    cookieStore.set('basic_auth', 'authenticated', {
      expires: expiresAt,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return NextResponse.json({ 
      success: true, 
      message: '認証成功' 
    });
  } catch (error) {
    console.error('Basic認証エラー:', error);
    return NextResponse.json(
      { success: false, message: '認証処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// セッション確認用のGETエンドポイント
export async function GET() {
  try {
    // 開発環境では常に認証済みとして扱う
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({ authenticated: true });
    }

    const cookieStore = await cookies();
    const authCookie = cookieStore.get('basic_auth');

    if (authCookie?.value === 'authenticated') {
      return NextResponse.json({ authenticated: true });
    }

    return NextResponse.json({ authenticated: false });
  } catch (error) {
    console.error('Basic認証セッション確認エラー:', error);
    return NextResponse.json({ authenticated: false });
  }
}

// ログアウト用のDELETEエンドポイント
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    
    cookieStore.set('basic_auth', '', {
      expires: new Date(0),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return NextResponse.json({ 
      success: true, 
      message: 'ログアウト成功' 
    });
  } catch (error) {
    console.error('ログアウトエラー:', error);
    return NextResponse.json(
      { success: false, message: 'ログアウト処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
