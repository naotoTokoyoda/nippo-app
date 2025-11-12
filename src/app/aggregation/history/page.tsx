import type { Metadata } from 'next';
import AggregationHistory from '@/components/AggregationHistory';

export const metadata: Metadata = {
  title: '集計完了一覧 | 日報アプリ',
  description: 'Freee納品書登録済みの完了案件一覧',
};

export default function AggregationHistoryPage() {
  return <AggregationHistory />;
}

