import { AggregationAdjustment } from '@/types/aggregation';

interface AggregationAdjustmentHistoryProps {
  adjustments: AggregationAdjustment[];
  formatCurrency: (amount: number) => string;
}

export default function AggregationAdjustmentHistory({
  adjustments,
  formatCurrency,
}: AggregationAdjustmentHistoryProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">調整履歴</h3>
        <span className="text-sm text-gray-500">{adjustments.length}件</span>
      </div>

      {adjustments.length > 0 ? (
        <div className="space-y-3">
          {adjustments.map((adjustment) => (
            <div key={adjustment.id} className="py-3 px-4 bg-gray-50 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
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
                    - {adjustment.createdBy}
                  </div>
                </div>
                <div
                  className={`font-semibold text-lg ml-4 ${
                    adjustment.amount === 0
                      ? 'text-gray-900'
                      : adjustment.amount > 0
                        ? 'text-green-600'
                        : 'text-red-600'
                  }`}
                >
                  {adjustment.amount > 0 ? '+' : ''}
                  {formatCurrency(adjustment.amount)}
                </div>
              </div>
            </div>
          ))}
        </div>
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
          <p className="text-gray-500 text-sm">調整履歴はありません</p>
          <p className="text-gray-400 text-xs mt-1">単価を調整すると、ここに履歴が表示されます</p>
        </div>
      )}
    </div>
  );
}
