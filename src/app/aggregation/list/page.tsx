import type { Metadata } from 'next';
import { AggregationList } from '@/components/aggregation';

export const metadata: Metadata = {
  title: '集計一覧 | 日報アプリ',
  description: '工数集計・単価計算の一覧画面',
};

export default function AggregationListPage() {
  return <AggregationList />;
}

