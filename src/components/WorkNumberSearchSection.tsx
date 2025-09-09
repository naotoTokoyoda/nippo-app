'use client';

import { useState } from 'react';
import { WorkNumberSearchResult } from '@/types/jooto';

interface WorkNumberSearchSectionProps {
  onWorkInfoSelect: (workInfo: {
    customerName: string;
    workNumberFront: string;
    workNumberBack: string;
    workName: string;
  }) => void;
}

export default function WorkNumberSearchSection({ onWorkInfoSelect }: WorkNumberSearchSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<WorkNumberSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // 工番検索の実行
  const searchWorkNumber = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    
    try {
      const response = await fetch(`/api/jooto/search?workNumber=${encodeURIComponent(query)}`);
      const result = await response.json();

      if (result.success && result.data) {
        setSearchResults(result.data);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('工番検索エラー:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 入力値変更時の処理
  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);

    // 既存のタイマーをクリア
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // デバウンス処理（500ms後に検索実行）
    const timeout = setTimeout(() => {
      searchWorkNumber(value);
    }, 500);

    setSearchTimeout(timeout);
  };

  // 検索結果選択時の処理
  const handleResultSelect = (result: WorkNumberSearchResult) => {
    // 工番から前番・後番を分離
    const workNumberParts = result.workNumber.split('-');
    const workNumberFront = workNumberParts[0] || '';
    const workNumberBack = workNumberParts.slice(1).join('-') || result.workNumber;

    // 工番前番のマッピング
    let mappedWorkNumberFront = '';
    if (workNumberFront.includes('5927')) {
      mappedWorkNumberFront = '5927';
    } else if (workNumberFront.includes('6028')) {
      mappedWorkNumberFront = '6028';
    } else if (workNumberFront.includes('6129')) {
      mappedWorkNumberFront = '6129';
    }

    // 親コンポーネントに選択結果を通知
    onWorkInfoSelect({
      customerName: result.customerName,
      workNumberFront: mappedWorkNumberFront,
      workNumberBack: workNumberBack,
      workName: result.workName
    });

    // 検索状態をリセット
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        工番検索
      </h2>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          工番を入力して検索
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            placeholder="工番を入力してください（例: 6028-14105）"
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
          />
          
          {/* ローディングインジケーター */}
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          工番を入力すると、Jootoから該当する作業情報を検索します
        </p>
      </div>

      {/* 検索中メッセージ */}
      {isLoading && searchQuery.trim() && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
          <div className="flex items-center">
            <svg className="animate-spin h-4 w-4 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            <span className="text-sm text-blue-700">「{searchQuery}」を検索しています...</span>
          </div>
        </div>
      )}

      {/* 検索結果 */}
      {hasSearched && !isLoading && (
        <div>
          {searchResults.length > 0 ? (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                検索結果（{searchResults.length}件）
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <button
                    key={`${result.taskId}-${index}`}
                    type="button"
                    onClick={() => handleResultSelect(result)}
                    className="w-full p-4 text-left bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <span className="text-xs font-medium text-gray-500 mr-3 min-w-[40px]">工番:</span>
                        <span className="font-semibold text-gray-900">{result.workNumber}</span>
                      </div>
                      
                      <div className="flex items-center">
                        <span className="text-xs font-medium text-gray-500 mr-3 min-w-[40px]">客先:</span>
                        <span className="text-sm text-gray-700 font-medium">
                          {result.customerName || '未設定'}
                        </span>
                      </div>
                      
                      <div className="flex items-center">
                        <span className="text-xs font-medium text-gray-500 mr-3 min-w-[40px]">作業:</span>
                        <span className="text-sm text-gray-600">
                          {result.workName || '未設定'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-right">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium">
                        クリックして適用
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="text-sm font-medium text-gray-600">検索結果なし</span>
              </div>
              <p className="text-xs text-gray-500">
                「<span className="font-semibold text-gray-700">{searchQuery}</span>」に一致する工番が見つかりません
              </p>
              <p className="text-xs text-gray-400 mt-1">
                工番を確認してもう一度お試しください
              </p>
            </div>
          )}
        </div>
      )}

      {/* 使用方法の説明 */}
      {!hasSearched && !searchQuery && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">使用方法</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• 工番を入力すると、Jootoから該当する作業情報を自動検索します</li>
            <li>• 検索結果をクリックすると、日報フォームに自動入力されます</li>
            <li>• 客先名、工番、作業名称が自動で設定されます</li>
          </ul>
        </div>
      )}
    </div>
  );
}
