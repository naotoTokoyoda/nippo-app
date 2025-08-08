import type { Metadata } from 'next';
import DailyReport from '@/components/DailyReport';

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
    <div className="min-h-screen bg-gray-100">
      <DailyReport />
    </div>
  );
} 