'use client';

import Link from 'next/link';
import { useState } from 'react';
import AggregationPasswordModal from './AggregationPasswordModal';
import { useEnvironment } from '@/hooks/useEnvironment';

export default function HomePage() {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const { isDevelopment, isClient } = useEnvironment();

  const handleAggregationClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // 開発環境では認証をスキップして直接遷移
    if (isDevelopment) {
      window.location.href = '/aggregation';
      return;
    }
    
    setIsPasswordModalOpen(true);
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-gray-800 mb-4">日報アプリ</h1>
        <p className="text-xl text-gray-600">作業日報を作成・管理するアプリケーション</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
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

        {/* 集計ボタン */}
        <div 
          onClick={handleAggregationClick}
          className="bg-white rounded-xl shadow-lg p-8 cursor-pointer border border-gray-100 h-full hover:shadow-xl transition-shadow"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">集計</h2>
            <p className="text-gray-600">工数集計・単価計算・請求書作成</p>
            {isClient && (
              <div className="mt-2 flex items-center justify-center">
                {isDevelopment ? (
                  <>
                    <svg className="w-4 h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs text-green-500">開発環境</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-purple-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-xs text-purple-500">認証が必要</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* パスワード認証モーダル */}
      <AggregationPasswordModal 
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}
