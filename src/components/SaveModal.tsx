'use client';

import { useState } from 'react';

interface SaveModalProps {
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

type ModalState = 'confirm' | 'loading' | 'success' | 'error';

export default function SaveModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  changes 
}: SaveModalProps) {
  const [modalState, setModalState] = useState<ModalState>('confirm');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setModalState('loading');
    try {
      await onConfirm();
      setModalState('success');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '保存中にエラーが発生しました');
      setModalState('error');
    }
  };

  const handleClose = () => {
    setModalState('confirm');
    setErrorMessage('');
    onClose();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const renderContent = () => {
    switch (modalState) {
      case 'confirm':
        return (
          <>
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
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirm}
                disabled={changes.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                保存する
              </button>
            </div>
          </>
        );

      case 'loading':
        return (
          <div className="px-6 py-8 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
              <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">保存中...</h3>
            <p className="text-sm text-gray-600">
              しばらくお待ちください
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="px-6 py-8 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg 
                className="h-6 w-6 text-green-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">保存完了</h3>
            <p className="text-sm text-gray-600 mb-6">
              単価の変更が保存されました
            </p>
            <button
              onClick={handleClose}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              OK
            </button>
          </div>
        );

      case 'error':
        return (
          <div className="px-6 py-8 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg 
                className="h-6 w-6 text-red-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">保存エラー</h3>
            <p className="text-sm text-gray-600 mb-6">
              {errorMessage}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                再試行
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}
