'use client';

import Link from 'next/link';

export default function AggregationMenu() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-gray-800 mb-4">集計機能</h1>
        <p className="text-xl text-gray-600">納品済み・集計中の案件を管理</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        {/* 集計一覧ボタン */}
        <Link href="/aggregation/list">
          <div className="bg-white rounded-xl shadow-lg p-8 cursor-pointer border border-gray-100 h-full hover:shadow-xl transition-shadow">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">集計一覧</h2>
              <p className="text-gray-600">納品済み・集計中の案件を管理</p>
            </div>
          </div>
        </Link>

        {/* 案件履歴ボタン */}
        <Link href="/aggregation/history">
          <div className="bg-white rounded-xl shadow-lg p-8 cursor-pointer border border-gray-100 h-full hover:shadow-xl transition-shadow">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">案件履歴</h2>
              <p className="text-gray-600">完了案件を確認</p>
            </div>
          </div>
        </Link>
      </div>

      {/* ホームに戻るボタン */}
      <div className="text-center mt-12">
        <Link href="/">
          <button className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            ← ホームに戻る
          </button>
        </Link>
      </div>
    </div>
  );
}

