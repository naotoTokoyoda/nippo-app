'use client';

import { useState } from 'react';

interface SaveConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  changes: Array<{
    activity: string;
    activityName: string;
    oldRate: number;
    newRate: number;
    memo: string;
    hours: number;
    adjustment: number;
  }>;
}

export default function SaveConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  changes 
}: SaveConfirmModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">保存内容の確認</h2>
          <p className="text-sm text-gray-600 mt-1">
            以下の変更内容で保存します。よろしいですか？
          </p>
        </div>

        {/* 変更内容 */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {changes.length === 0 ? (
            <p className="text-gray-500">変更はありません。</p>
          ) : (
            <div className="space-y-4">
              {changes.map((change, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium text-gray-900">{change.activityName}</h3>
                      <p className="text-sm text-gray-600">
                        {change.hours}時間 × 単価変更
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        {formatCurrency(change.oldRate)} → {formatCurrency(change.newRate)}
                      </div>
                      <div className={`text-sm font-medium ${
                        change.adjustment > 0 ? 'text-green-600' : 
                        change.adjustment < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        調整額: {change.adjustment > 0 ? '+' : ''}{formatCurrency(change.adjustment)}
                      </div>
                    </div>
                  </div>
                  
                  {change.memo && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">備考:</span> {change.memo}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || changes.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
          >
            {isLoading && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isLoading ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>
    </div>
  );
}
