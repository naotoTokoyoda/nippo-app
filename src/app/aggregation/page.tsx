import type { Metadata } from 'next';
import { AggregationMenu } from '@/components/aggregation';

export const metadata: Metadata = {
  title: '集計機能 | 日報アプリ',
  description: '工数集計・単価計算・請求書作成のメニュー',
};

export default function AggregationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
      <AggregationMenu />
    </div>
  );
}
