import DatabaseManager from '@/components/DatabaseManager'

export const metadata = {
  title: 'データベース管理 - 日報アプリ',
  description: 'データベースの状態確認と管理を行います',
}

export default function DatabasePage() {
  return <DatabaseManager />
}
