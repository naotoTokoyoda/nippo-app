import type { Metadata } from 'next';
import AggregationDetail from '@/components/AggregationDetail';

export const metadata: Metadata = {
  title: '集計詳細 | 日報アプリ',
  description: '工番別の詳細集計・単価計算画面',
};

interface AggregationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AggregationDetailPage({ params }: AggregationDetailPageProps) {
  const { id } = await params;
  return <AggregationDetail workOrderId={id} />;
}
