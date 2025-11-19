'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Rate {
  id: string;
  activity: string;
  activityType: string;
  displayName: string;
  costRate: number;
  billRate: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function RatesPage() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'labor' | 'machine'>('all');

  useEffect(() => {
    fetchRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType]);

  const fetchRates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType !== 'all') {
        params.append('activityType', filterType);
      }

      const response = await fetch(`/api/admin/rates?${params}`);
      const data = await response.json();

      if (data.success) {
        setRates(data.data);
      } else {
        setError(data.error || '単価の取得に失敗しました');
      }
    } catch (err) {
      setError('単価の取得に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この単価を削除しますか？\n※この操作は取り消せません。')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/rates/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        alert('単価を削除しました');
        fetchRates();
      } else {
        alert(data.error || '単価の削除に失敗しました');
      }
    } catch (err) {
      alert('単価の削除に失敗しました');
      console.error(err);
    }
  };

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case 'labor':
        return '人工費';
      case 'machine':
        return '機械稼働費';
      default:
        return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const formatCurrency = (value: number) => {
    return `¥${value.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">単価管理</h1>
        <Link
          href="/admin/rates/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 新規単価作成
        </Link>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* フィルター */}
      <div className="mb-4 flex gap-4 items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-lg ${
              filterType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            すべて
          </button>
          <button
            onClick={() => setFilterType('labor')}
            className={`px-3 py-1 rounded-lg ${
              filterType === 'labor'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            人工費
          </button>
          <button
            onClick={() => setFilterType('machine')}
            className={`px-3 py-1 rounded-lg ${
              filterType === 'machine'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            機械稼働費
          </button>
        </div>
      </div>

      {/* 単価一覧テーブル */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                種別
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                表示名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Activity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                原価単価
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                請求単価
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                有効期間
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rates.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  単価が登録されていません
                </td>
              </tr>
            ) : (
              rates.map((rate) => (
                <tr key={rate.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getActivityTypeLabel(rate.activityType)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {rate.displayName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {rate.activity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(Number(rate.costRate))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(Number(rate.billRate))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(rate.effectiveFrom)}
                    {rate.effectiveTo && ` 〜 ${formatDate(rate.effectiveTo)}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/rates/${rate.id}/edit`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        編集
                      </Link>
                      <button
                        onClick={() => handleDelete(rate.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

