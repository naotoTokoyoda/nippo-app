import type { Metadata } from 'next';
import { AggregationHistory } from '@/components/aggregation';

export const metadata: Metadata = {
  title: '案件履歴 | 日報アプリ',
  description: 'Freee納品書登録済みの完了案件履歴',
};

export default function AggregationHistoryPage() {
  return <AggregationHistory />;
}

