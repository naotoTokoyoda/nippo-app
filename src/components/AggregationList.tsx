'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';

// 集計一覧の型定義
interface AggregationItem {
  id: string;
  workNumber: string; // 工番（前番-後番）
  customerName: string;
  projectName: string;
  totalHours: number;
  lastUpdated: string;
  status: 'aggregating' | 'aggregated';
  term?: string; // 期区分
}

export default function AggregationList() {
  const [items, setItems] = useState<AggregationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTerm, setFilterTerm] = useState<string>('');
  const [filterCustomer, setFilterCustomer] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // APIからデータを取得
  const fetchAggregationItems = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterTerm) params.append('term', filterTerm);
      if (filterCustomer) params.append('customer', filterCustomer);
      if (searchQuery) params.append('search', searchQuery);
      params.append('status', 'aggregating');

      const response = await fetch(`/api/aggregation?${params}`);
      if (!response.ok) {
        throw new Error('データの取得に失敗しました');
      }

      const data = await response.json();
      setItems(data.items);
    } catch (error) {
      console.error('集計一覧取得エラー:', error);
      alert('データの取得に失敗しました。再度お試しください。');
    } finally {
      setLoading(false);
    }
  }, [filterTerm, filterCustomer, searchQuery]);

  useEffect(() => {
    fetchAggregationItems();
  }, [fetchAggregationItems]);

  // 期区分の選択肢を取得（APIから別途取得することも可能）
  const termOptions = ['59期', '59期-JFE', '60期'];

  const handleSync = () => {
    // TODO: Jooto API同期処理
    alert('Jooto同期機能は Phase 3 で実装予定です');
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`;
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    if (status === 'aggregating') {
      return `${baseClasses} bg-blue-100 text-blue-800`;
    }
    return `${baseClasses} bg-gray-100 text-gray-800`;
  };

  const getStatusText = (status: string) => {
    return status === 'aggregating' ? '集計中' : '集計済み';
  };

  if (loading) {
    return (
      <PageLayout title="集計一覧">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="集計一覧">
      <div className="space-y-6">
        {/* ヘッダーアクション */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="text-sm text-gray-600">
            {items.length}件の集計対象案件
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSync}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              Jootoと同期
            </button>
            <Link href="/aggregation/register">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                手動登録
              </button>
            </Link>
          </div>
        </div>

        {/* フィルタ */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                期区分
              </label>
              <select
                value={filterTerm}
                onChange={(e) => setFilterTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">すべて</option>
                {termOptions.map(term => (
                  <option key={term} value={term}>{term}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                顧客名
              </label>
              <input
                type="text"
                value={filterCustomer}
                onChange={(e) => setFilterCustomer(e.target.value)}
                placeholder="顧客名で絞り込み"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                検索
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="工番・案件名で検索"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
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
                    最終更新
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
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
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
                      {formatHours(item.totalHours)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.lastUpdated}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(item.status)}>
                        {getStatusText(item.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link href={`/aggregation/${item.id}`}>
                        <button className="text-blue-600 hover:text-blue-800 font-medium">
                          詳細
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {items.length === 0 && (
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
