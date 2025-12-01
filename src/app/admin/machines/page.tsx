'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Machine {
  id: string;
  name: string;
  isActive: boolean;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function MachinesPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);

  useEffect(() => {
    fetchMachines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeInactive]);

  const fetchMachines = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (includeInactive) {
        params.append('includeInactive', 'true');
      }

      const response = await fetch(`/api/admin/machines?${params}`);
      const data = await response.json();

      if (data.success) {
        setMachines(data.data);
      } else {
        setError(data.error || '機械の取得に失敗しました');
      }
    } catch (err) {
      setError('機械の取得に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この機械を削除（無効化）しますか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/machines/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        alert('機械を削除しました');
        fetchMachines();
      } else {
        alert(data.error || '機械の削除に失敗しました');
      }
    } catch (err) {
      alert('機械の削除に失敗しました');
      console.error(err);
    }
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
        <h1 className="text-2xl font-bold text-gray-900">機械管理</h1>
        <Link
          href="/admin/machines/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 新規機械登録
        </Link>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* フィルター */}
      <div className="mb-4 flex gap-4 items-center">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-700">無効な機械も表示</span>
        </label>
      </div>

      {/* 注意事項 */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong className="font-semibold">💡 ヒント</strong><br />
          機械を登録後、「単価管理」画面で各機械の単価を設定してください。
        </p>
      </div>

      {/* 機械一覧テーブル */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                機械名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                メモ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                登録日時
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {machines.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  機械が登録されていません
                </td>
              </tr>
            ) : (
              machines.map((machine) => (
                <tr key={machine.id} className={!machine.isActive ? 'bg-gray-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {machine.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {machine.memo || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {machine.isActive ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        有効
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        無効
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(machine.createdAt).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/machines/${machine.id}/edit`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        編集
                      </Link>
                      {machine.isActive && (
                        <button
                          onClick={() => handleDelete(machine.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          削除
                        </button>
                      )}
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

