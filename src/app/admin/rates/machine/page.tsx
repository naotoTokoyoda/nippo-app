'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Machine {
  id: string;
  name: string;
  memo: string | null;
}

interface Rate {
  id: string;
  activity: string;
  activityType: string;
  displayName: string;
  machineId: string | null;
  costRate: number;
  billRate: number;
  memo: string | null;
  machine?: Machine;
}

export default function MachineRatesPage() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('activityType', 'machine');

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
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Link
            href="/admin/rates"
            className="text-gray-500 hover:text-gray-700"
          >
            ← 単価管理に戻る
          </Link>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🔧 機械単価管理</h1>
            <p className="mt-1 text-sm text-gray-600">
              機械稼働費の単価を管理します（機械マスタと連携）
            </p>
          </div>
          <Link
            href="/admin/rates/machine/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + 新規機械単価作成
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* 機械単価一覧テーブル */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                機械名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                原価単価
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                請求単価
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                メモ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rates.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  機械単価が登録されていません
                </td>
              </tr>
            ) : (
              rates.map((rate) => (
                <tr key={rate.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {rate.machine?.name || rate.displayName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(Number(rate.costRate))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(Number(rate.billRate))}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {rate.memo || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/rates/machine/${rate.id}/edit`}
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

      {/* 補足情報 */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          💡 機械単価について
        </h3>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• 機械単価は機械マスタと連携しています</li>
          <li>• 機械名は機械マスタから自動取得されます</li>
          <li>• 機械マスタで機械名を変更すると、単価にも反映されます</li>
        </ul>
      </div>
    </div>
  );
}

