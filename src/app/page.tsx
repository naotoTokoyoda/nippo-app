import type { Metadata } from 'next';
import HomePage from '@/components/HomePage';

export const metadata: Metadata = {
  title: '日報アプリ',
  description: '作業日報を作成・管理するアプリケーション',
  keywords: ['日報', '作業報告', 'プロジェクト管理'],
  authors: [{ name: '日報アプリ開発チーム' }],
  openGraph: {
    title: '日報アプリ',
    description: '作業日報を作成・管理するアプリケーション',
    type: 'website',
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <HomePage />
    </div>
  );
}
