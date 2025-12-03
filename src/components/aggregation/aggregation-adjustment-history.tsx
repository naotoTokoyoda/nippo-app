'use client';

import { AggregationAdjustment } from '@/types/aggregation';
import { useState, useMemo } from 'react';

interface AggregationAdjustmentHistoryProps {
  adjustments: AggregationAdjustment[];
}

type FilterType = 'all' | 'rate_adjustment' | 'expense_change' | 'amount_change';

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'rate_adjustment', label: '単価変更' },
  { value: 'expense_change', label: '経費変更' },
  { value: 'amount_change', label: '金額変更' },
];

const DEFAULT_DISPLAY_COUNT = 5;

export default function AggregationAdjustmentHistory({
  adjustments,
}: AggregationAdjustmentHistoryProps) {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [isExpanded, setIsExpanded] = useState(false);

  // フィルタリングされた履歴（メモ更新とコメント追加は除外）
  const filteredAdjustments = useMemo(() => {
    // まずメモ更新とコメント追加を除外
    const validAdjustments = adjustments.filter(
      (adj) => adj.type !== 'memo_update' && adj.type !== 'final_decision_change'
    );
    
    // 日付の降順（新しい順）にソート
    const sortedAdjustments = [...validAdjustments].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    if (filterType === 'all') {
      return sortedAdjustments;
    }
    
    // amount_changeは estimate_amount_change と final_decision_amount_change の両方を含む
    if (filterType === 'amount_change') {
      return sortedAdjustments.filter(
        (adj) => 
          adj.type === 'estimate_amount_change' || 
          adj.type === 'final_decision_amount_change'
      );
    }
    
    return sortedAdjustments.filter((adj) => adj.type === filterType);
  }, [adjustments, filterType]);

  // 表示する履歴（折りたたみ時は最新5件のみ）
  const displayedAdjustments = useMemo(() => {
    if (isExpanded) {
      return filteredAdjustments;
    }
    return filteredAdjustments.slice(0, DEFAULT_DISPLAY_COUNT);
  }, [filteredAdjustments, isExpanded]);

  const hiddenCount = filteredAdjustments.length - displayedAdjustments.length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">調整履歴</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{filteredAdjustments.length}件</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FilterType)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredAdjustments.length > 0 ? (
        <>
        <div className="space-y-3">
            {displayedAdjustments.map((adjustment) => (
            <div key={adjustment.id} className="py-3 px-4 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900">{adjustment.reason}</div>
              {adjustment.memo && (
                <div className="text-sm text-gray-600 mt-1">{adjustment.memo}</div>
              )}
              <div className="text-xs text-gray-500 mt-2">
                {new Date(adjustment.createdAt).toLocaleString('ja-JP', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  timeZone: 'Asia/Tokyo',
                })}{' '}
                - {adjustment.user?.name || adjustment.createdBy}
              </div>
            </div>
          ))}
        </div>
          
          {hiddenCount > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full mt-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
            >
              {isExpanded ? '閉じる' : `もっと見る（+${hiddenCount}件）`}
            </button>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">
            {filterType === 'all' ? '調整履歴はありません' : `${FILTER_OPTIONS.find(opt => opt.value === filterType)?.label}の履歴はありません`}
          </p>
          <p className="text-gray-400 text-xs mt-1">単価を調整すると、ここに履歴が表示されます</p>
        </div>
      )}
    </div>
  );
}
