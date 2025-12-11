import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '管理画面 | 日報アプリ',
  description: 'システム管理画面',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link 
                href="/admin" 
                className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
              >
                ⚙️ 管理画面
              </Link>
            </div>
            <nav className="flex items-center space-x-1">
              <Link 
                href="/" 
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                ホームに戻る
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* サイドバーとメインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* サイドバー */}
          <aside className="w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  管理メニュー
                </h2>
              </div>
              <ul className="divide-y divide-gray-200">
                <li>
                  <Link
                    href="/admin/users"
                    className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    <div className="flex items-center">
                      <span className="text-lg mr-3">👥</span>
                      <span className="font-medium">ユーザー管理</span>
                    </div>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/rates"
                    className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    <div className="flex items-center">
                      <span className="text-lg mr-3">💰</span>
                      <span className="font-medium">単価管理</span>
                    </div>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/machines"
                    className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    <div className="flex items-center">
                      <span className="text-lg mr-3">🔧</span>
                      <span className="font-medium">機械管理</span>
                    </div>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/expense-rates"
                    className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    <div className="flex items-center">
                      <span className="text-lg mr-3">📊</span>
                      <span className="font-medium">経費率管理</span>
                    </div>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/audit-logs"
                    className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    <div className="flex items-center">
                      <span className="text-lg mr-3">📋</span>
                      <span className="font-medium">監査ログ</span>
                    </div>
                  </Link>
                </li>
              </ul>
            </nav>

            {/* 注意事項 */}
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-xs text-yellow-800">
                <strong className="font-semibold">⚠️ 注意</strong><br />
                この管理画面はAdmin専用です。変更内容は即座にシステムに反映されます。
              </p>
            </div>
          </aside>

          {/* メインコンテンツ */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

