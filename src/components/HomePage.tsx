'use client';

import Link from 'next/link';

export default function HomePage() {

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-gray-800 mb-4">日報アプリ</h1>
        <p className="text-xl text-gray-600">作業日報を作成・管理するアプリケーション</p>
      </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {/* 日報入力ボタン */}
          <Link href="/daily-report">
            <div className="bg-white rounded-xl shadow-lg p-8 cursor-pointer border border-gray-100 h-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">日報入力</h2>
                <p className="text-gray-600">新しい日報を作成します</p>
              </div>
            </div>
          </Link>

          {/* 日報一覧ボタン */}
          <Link href="/reports">
            <div className="bg-white rounded-xl shadow-lg p-8 cursor-pointer border border-gray-100 h-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">日報一覧</h2>
                <p className="text-gray-600">送信された日報を確認・管理します</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
