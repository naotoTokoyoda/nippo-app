'use client';

import { useRouter } from 'next/navigation';

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  showHomeButton?: boolean;
  showListButton?: boolean;
  showCreateButton?: boolean;
}

export default function PageLayout({ 
  children, 
  title, 
  showHomeButton = true,
  showListButton = false,
  showCreateButton = false
}: PageLayoutProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
          <div className="flex gap-2">
            {showHomeButton && (
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
              >
                ホーム
              </button>
            )}
            {showListButton && (
              <button
                onClick={() => router.push('/reports')}
                className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                一覧を見る
              </button>
            )}
            {showCreateButton && (
              <button
                onClick={() => router.push('/daily-report')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                新規作成
              </button>
            )}
          </div>
        </div>

        {/* メインコンテンツ */}
        {children}
      </div>
    </div>
  );
}
