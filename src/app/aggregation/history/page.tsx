import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AggregationHistory } from '@/components/aggregation';

export const metadata: Metadata = {
  title: '案件履歴 | 日報アプリ',
  description: 'Freee納品書登録済みの完了案件履歴',
};

// ローディングコンポーネント
function HistoryLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">読み込み中...</p>
      </div>
    </div>
  );
}

export default function AggregationHistoryPage() {
  return (
    <Suspense fallback={<HistoryLoading />}>
      <AggregationHistory />
    </Suspense>
  );
}
