'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';

// 集計一覧の型定義
interface AggregationItem {
  id: string;
  workNumber: string; // 工番（前番-後番）
  customerName: string;
  projectName: string;
  totalHours: number;
  lastUpdated?: string | null;
  status: 'aggregating' | 'aggregated' | 'delivered';
  term?: string; // 期区分
  taskId?: number; // JootoタスクID
}

export default function AggregationList() {
  const [items, setItems] = useState<AggregationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'delivered' | 'aggregating' | 'aggregated'>('aggregating');
  const router = useRouter();

  // APIからデータを取得
  const fetchAggregationItems = useCallback(async () => {
    try {
      setLoading(true);
      
      // Jooto納品済みタスクを取得
      const jootoResponse = await fetch('/api/jooto/delivered-tasks');
      if (!jootoResponse.ok) {
        throw new Error('Jooto納品済みタスクの取得に失敗しました');
      }
      const jootoData = await jootoResponse.json();
      
      const allItems = jootoData.success ? jootoData.items : [];
      setItems(allItems);
    } catch (error) {
      console.error('集計一覧取得エラー:', error);
      alert('データの取得に失敗しました。再度お試しください。');
    } finally {
      setLoading(false);
    }
  }, []);

  // 認証状態をチェック
  const checkAuthentication = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/aggregation');
      const data = await response.json();
      
      if (!data.authenticated) {
        // 認証されていない場合はホームに戻る
        router.replace('/');
        return;
      }
      
      setIsAuthenticated(true);
    } catch (error) {
      console.error('認証チェックエラー:', error);
      router.replace('/');
    }
  }, [router]);

  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAggregationItems();
    }
  }, [fetchAggregationItems, isAuthenticated]);

  const formatHours = (hours: number) => {
    return `${hours.toFixed(2)}時間`;
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    if (status === 'aggregating') {
      return `${baseClasses} bg-blue-100 text-blue-800`;
    } else if (status === 'delivered') {
      return `${baseClasses} bg-green-100 text-green-800`;
    }
    return `${baseClasses} bg-gray-100 text-gray-800`;
  };

  const getStatusText = (status: string) => {
    if (status === 'aggregating') return '集計中';
    if (status === 'delivered') return '納品済み';
    return '集計済み';
  };

  // 認証チェック中または未認証の場合
  if (!isAuthenticated || loading) {
    return (
      <PageLayout title="集計一覧">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">認証を確認しています...</span>
        </div>
      </PageLayout>
    );
  }

  // タブごとにアイテムをフィルタリング
  const filteredItems = items.filter(item => item.status === activeTab);

  return (
    <PageLayout title="集計一覧">
      <div className="space-y-6">
        {/* タブ */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('delivered')}
              className={`${
                activeTab === 'delivered'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              納品済み
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'delivered' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
              }`}>
                {items.filter(item => item.status === 'delivered').length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('aggregating')}
              className={`${
                activeTab === 'aggregating'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              集計中
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'aggregating' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
              }`}>
                {items.filter(item => item.status === 'aggregating').length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('aggregated')}
              className={`${
                activeTab === 'aggregated'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Freee納品書登録済み
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'aggregated' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
              }`}>
                {items.filter(item => item.status === 'aggregated').length}
              </span>
            </button>
          </nav>
        </div>

        {/* ヘッダー */}
        <div className="text-sm text-gray-600">
          {filteredItems.length}件の集計対象案件
        </div>

        {/* テーブル */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    工番
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    顧客
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    案件名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    累計時間
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.workNumber}
                      {item.term && (
                        <div className="text-xs text-gray-500">{item.term}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.customerName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.projectName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.totalHours === 0 ? (
                        <span className="text-red-500 font-medium">{formatHours(item.totalHours)}</span>
                      ) : (
                        formatHours(item.totalHours)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(item.status)}>
                        {getStatusText(item.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link href={`/aggregation/${item.id}`}>
                        <button className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer hover:cursor-pointer hover:bg-transparent focus:bg-transparent">
                          詳細
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500">
                表示できる集計対象案件がありません
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
