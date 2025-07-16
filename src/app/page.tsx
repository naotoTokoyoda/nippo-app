'use client';

import Link from 'next/link';
import { useReportStore } from '@/stores/reportStore';

export default function Home() {
  const loadTestData = useReportStore((state) => state.loadTestData);
  const clearAllData = useReportStore((state) => state.clearAllData);
  const isTestDataLoaded = useReportStore((state) => state.isTestDataLoaded);
  const reports = useReportStore((state) => state.reports);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-4xl mx-auto p-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">日報アプリ</h1>
          <p className="text-xl text-gray-600">作業日報を作成・管理するアプリケーション</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {/* 日報入力ボタン */}
          <Link href="/daily-report">
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer border border-gray-100">
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
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer border border-gray-100">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">日報一覧</h2>
                <p className="text-gray-600">送信された日報を確認・管理します</p>
                {reports.length > 0 && (
                  <div className="mt-2 text-sm text-blue-600">
                    {reports.length}件の日報
                  </div>
                )}
              </div>
            </div>
          </Link>
        </div>

        {/* テストデータ管理 */}
        <div className="mt-8 text-center">
          <div className="bg-white rounded-lg shadow-sm p-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">テストデータ管理</h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={loadTestData}
                disabled={isTestDataLoaded}
                className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTestDataLoaded ? 'テストデータ読み込み済み' : 'テストデータを読み込み'}
              </button>
              <button
                onClick={clearAllData}
                className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                すべてのデータをクリア
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-3">
              テストデータには5件のサンプル日報が含まれています
            </p>
          </div>
        </div>

        {/* 機能概要 */}
        <div className="mt-8 text-center">
          <div className="bg-white rounded-lg shadow-sm p-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">機能概要</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <div className="font-medium text-blue-600 mb-1">📝 日報作成</div>
                <div>複数の作業項目を追加可能</div>
              </div>
              <div>
                <div className="font-medium text-green-600 mb-1">🔍 フィルタリング</div>
                <div>日付・作業者・客先で検索</div>
              </div>
              <div>
                <div className="font-medium text-purple-600 mb-1">⏱️ 時間計算</div>
                <div>自動で合計時間を算出</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
