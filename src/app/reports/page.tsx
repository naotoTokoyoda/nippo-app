import type { Metadata } from 'next';
import ReportsList from '@/components/ReportsList';
import PageLayout from '@/components/PageLayout';

export const metadata: Metadata = {
  title: '日報一覧 - 日報アプリ',
  description: '送信された日報を確認・管理します',
  keywords: ['日報一覧', '作業報告', 'プロジェクト管理'],
  openGraph: {
    title: '日報一覧 - 日報アプリ',
    description: '送信された日報を確認・管理します',
    type: 'website',
  },
};

export default function ReportsPage() {
  return (
    <PageLayout title="日報一覧" showCreateButton={true}>
      <ReportsList />
    </PageLayout>
  );
} 