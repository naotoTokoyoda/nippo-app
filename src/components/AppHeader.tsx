'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function AppHeader() {
  const { data: session, status } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pathname = usePathname();

  // ログインページと管理画面ではヘッダーを表示しない（管理画面は独自ヘッダーがある）
  if (pathname === '/login' || pathname.startsWith('/admin')) {
    return null;
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut({ callbackUrl: '/login' });
  };

  // ローディング中は何も表示しない
  if (status === 'loading') {
    return (
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <Link href="/" className="text-lg font-bold text-gray-900">
              📋 日報アプリ
            </Link>
          </div>
        </div>
      </header>
    );
  }

  // 未ログインの場合
  if (!session) {
    return null;
  }

  const userRole = session.user?.role;
  const userName = session.user?.name;

  // ロールに応じた表示
  const getRoleBadge = () => {
    if (userRole === 'admin') {
      return (
        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">
          Admin
        </span>
      );
    }
    if (userRole === 'manager') {
      return (
        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
          工場
        </span>
      );
    }
    return null;
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          {/* ロゴ */}
          <Link href="/" className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors">
            📋 日報アプリ
          </Link>

          {/* ユーザー情報 & ログアウト */}
          <div className="flex items-center gap-4">
            {/* ログインユーザー表示 */}
            <div className="flex items-center gap-2">
              {getRoleBadge()}
              <span className="text-sm text-gray-700 font-medium">
                {userName}
              </span>
            </div>

            {/* ログアウトボタン */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
            >
              {isLoggingOut ? (
                <span className="flex items-center">
                  <svg className="animate-spin h-4 w-4 mr-1" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  ログアウト中...
                </span>
              ) : (
                'ログアウト'
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

