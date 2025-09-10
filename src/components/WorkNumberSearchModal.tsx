'use client';

import { useState, useEffect } from 'react';
import { WorkNumberSearchResult } from '@/types/jooto';

interface WorkNumberSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkItemAdd: (workInfo: {
    customerName: string;
    workNumberFront: string;
    workNumberBack: string;
    workName: string;
  }) => void;
}

export default function WorkNumberSearchModal({ 
  isOpen, 
  onClose, 
  onWorkItemAdd 
}: WorkNumberSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<WorkNumberSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // モーダルが開かれた時の初期化
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setHasSearched(false);
      setIsLoading(false);
    }
  }, [isOpen]);

  // ESCキーでモーダルを閉じる & 背景スクロール無効化
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      // モーダル表示時は背景のスクロールを無効化
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleEsc);
    }
    
    return () => {
      // クリーンアップ時にスクロールを復元
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

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
    // APIから取得した正確な情報を使用
    onWorkItemAdd({
      customerName: result.customerName,
      workNumberFront: result.workNumberFront,
      workNumberBack: result.workNumberBack,
      workName: result.workName
    });

    // モーダルを閉じる
    onClose();
  };

  // モーダルが開いていない場合は何も表示しない
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            工番情報検索
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 検索入力 */}
        <div className="p-6 border-b border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            工番情報のキーワード検索
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              autoFocus
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
          <p className="text-xs text-gray-500 mt-2">
            工番や作業名などのキーワードを入力すると、Jootoから該当する作業情報を検索します
          </p>
        </div>

        {/* 検索結果エリア */}
        <div className="p-6 flex-1 overflow-hidden">
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
                  <h3 className="text-sm font-medium text-gray-700 mb-4">
                    検索結果（{searchResults.length}件）
                  </h3>
                  <div className="space-y-5 max-h-80 overflow-y-auto pr-2">
                    {searchResults.map((result, index) => (
                      <button
                        key={`${result.taskId}-${index}`}
                        type="button"
                        onClick={() => handleResultSelect(result)}
                        className="w-full p-4 text-left bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                  <div className="flex items-center justify-center mb-3">
                    <svg className="w-8 h-8 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="text-lg font-medium text-gray-600">検索結果なし</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">
                    「<span className="font-semibold text-gray-700">{searchQuery}</span>」に一致する工番が見つかりません
                  </p>
                  <p className="text-xs text-gray-400">
                    工番を確認してもう一度お試しください
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 初期状態の説明 */}
          {!hasSearched && !searchQuery && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="text-sm font-medium text-blue-800 mb-3">使用方法</h4>
              <ul className="text-sm text-blue-700 space-y-2">
                <li className="flex items-start">
                  <span className="inline-block w-4 h-4 rounded-full bg-blue-200 text-blue-800 text-xs font-bold text-center leading-4 mr-2 mt-0.5">1</span>
                  工番や作業名などのキーワードを入力すると、Jootoから該当する作業情報を検索します
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-4 h-4 rounded-full bg-blue-200 text-blue-800 text-xs font-bold text-center leading-4 mr-2 mt-0.5">2</span>
                  検索結果をクリックすると、作業項目に自動入力されます
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-4 h-4 rounded-full bg-blue-200 text-blue-800 text-xs font-bold text-center leading-4 mr-2 mt-0.5">3</span>
                  客先名、工番、作業名称が自動で設定されます
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
