'use client';

import { useState } from 'react';
import { ExpenseItem } from '@/types/aggregation';

interface RateChange {
  activity: string;
  activityName: string;
  oldRate: number;
  newRate: number;
  memo: string;
  hours: number;
  adjustment: number;
}

interface SaveConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  rateChanges: RateChange[];
  expenses: ExpenseItem[];
}

const CATEGORY_LABELS: Record<string, string> = {
  materials: '材料費',
  outsourcing: '外注費',
  shipping: '送料',
  other: 'その他',
};

export default function SaveConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  rateChanges,
  expenses,
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

  const expenseCostTotal = expenses.reduce((sum, expense) => sum + expense.costTotal, 0);
  const expenseBillTotal = expenses.reduce((sum, expense) => sum + expense.billTotal, 0);
  const expenseFileEstimateTotal = expenses.reduce((sum, expense) => sum + (expense.fileEstimate ?? 0), 0);

  const expenseCategorySummary = expenses.reduce<Record<string, { cost: number; bill: number; file: number }>>((acc, expense) => {
    const summary = acc[expense.category] ?? { cost: 0, bill: 0, file: 0 };
    summary.cost += expense.costTotal;
    summary.bill += expense.billTotal;
    summary.file += expense.fileEstimate ?? 0;
    acc[expense.category] = summary;
    return acc;
  }, {});

  const hasNoChanges = rateChanges.length === 0 && expenses.length === 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">保存内容の確認</h2>
          <p className="text-sm text-gray-600 mt-1">
            以下の変更内容で保存します。よろしいですか？
          </p>
        </div>

        {/* 変更内容 */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {hasNoChanges ? (
            <p className="text-gray-500">変更はありません。</p>
          ) : (
            <div className="space-y-6">
              {/* 労務費の変更セクション */}
              {rateChanges.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center mb-3">
                    <div className="w-4 h-4 bg-blue-500 rounded-full mr-2" />
                    <h3 className="font-semibold text-blue-900">労務費の変更</h3>
                  </div>
                  <div className="space-y-3">
                    {rateChanges.map((change, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-blue-100">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900">{change.activityName}</h4>
                            <p className="text-sm text-gray-600">{change.hours}時間 × 単価変更</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">
                              {formatCurrency(change.oldRate)} → {formatCurrency(change.newRate)}
                            </div>
                            <div
                              className={`text-sm font-medium ${
                                change.adjustment > 0
                                  ? 'text-green-600'
                                  : change.adjustment < 0
                                  ? 'text-red-600'
                                  : 'text-gray-600'
                              }`}
                            >
                              調整額: {change.adjustment > 0 ? '+' : ''}
                              {formatCurrency(change.adjustment)}
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
                    <div className="bg-blue-100 rounded-lg p-3 border-t border-blue-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-blue-900">労務費調整額合計</span>
                        <span
                          className={`text-sm font-bold ${
                            rateChanges.reduce((sum, c) => sum + c.adjustment, 0) > 0
                              ? 'text-green-700'
                              : 'text-red-700'
                          }`}
                        >
                          {rateChanges.reduce((sum, c) => sum + c.adjustment, 0) > 0 ? '+' : ''}
                          {formatCurrency(rateChanges.reduce((sum, c) => sum + c.adjustment, 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 経費の変更セクション */}
              {expenses.length > 0 && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center mb-3">
                    <div className="w-4 h-4 bg-green-500 rounded-full mr-2" />
                    <h3 className="font-semibold text-green-900">経費の保存内容</h3>
                  </div>
                  <div className="space-y-3">
                    {expenses.map((expense, index) => (
                      <div key={expense.id || index} className="bg-white rounded-lg p-3 border border-green-100">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {CATEGORY_LABELS[expense.category] ?? expense.category}
                            </div>
                            <div className="text-xs text-gray-600">
                              原価: {formatCurrency(expense.costUnitPrice)} × {expense.costQuantity} ={' '}
                              {formatCurrency(expense.costTotal)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">
                              請求: {formatCurrency(expense.billUnitPrice)} × {expense.billQuantity}
                            </div>
                            <div className="text-sm font-semibold text-gray-900">
                              {formatCurrency(expense.billTotal)}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-600">
                          ファイル見積: {expense.fileEstimate != null ? formatCurrency(expense.fileEstimate) : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 bg-green-100 rounded-lg p-3 border-t border-green-200 space-y-1">
                    {Object.entries(expenseCategorySummary).map(([category, summary]) => (
                      <div key={category} className="flex flex-col sm:flex-row sm:justify-between text-xs text-green-900">
                        <span className="font-medium">{CATEGORY_LABELS[category] ?? category}</span>
                        <span>
                          原価 {formatCurrency(summary.cost)}
                          <span className="mx-1 text-green-300">|</span>
                          請求 {formatCurrency(summary.bill)}
                          <span className="mx-1 text-green-300">|</span>
                          ファイル見積 {summary.file > 0 ? formatCurrency(summary.file) : '—'}
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-green-200 text-xs text-green-900 flex flex-col sm:flex-row sm:justify-between">
                      <span className="font-semibold">経費合計</span>
                      <span>
                        原価 {formatCurrency(expenseCostTotal)}
                        <span className="mx-1 text-green-300">|</span>
                        請求 {formatCurrency(expenseBillTotal)}
                        <span className="mx-1 text-green-300">|</span>
                        ファイル見積 {expenseFileEstimateTotal > 0 ? formatCurrency(expenseFileEstimateTotal) : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
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
            disabled={isLoading || hasNoChanges}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
          >
            {isLoading && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {isLoading ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>
    </div>
  );
}
