import type { Metadata } from 'next';
import WorkOrderRegistration from '@/components/WorkOrderRegistration';

export const metadata: Metadata = {
  title: '工番登録 | 集計 - 日報アプリ',
  description: '集計対象工番の手動登録画面',
};

export default function RegisterPage() {
  return <WorkOrderRegistration />;
}
