import type { Metadata } from 'next';
import DailyReport from '@/components/DailyReport';
import PageLayout from '@/components/PageLayout';

export const metadata: Metadata = {
  title: '日報入力 - 日報アプリ',
  description: '新しい作業日報を作成します',
  keywords: ['日報入力', '作業報告', 'プロジェクト管理'],
  openGraph: {
    title: '日報入力 - 日報アプリ',
    description: '新しい作業日報を作成します',
    type: 'website',
  },
};

export default function DailyReportPage() {
  return (
    <PageLayout title="日報" showListButton={true}>
      <DailyReport />
    </PageLayout>
  );
} 