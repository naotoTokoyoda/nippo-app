'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Machine {
  id: string;
  name: string;
  isActive: boolean;
  memo: string | null;
}

interface EditMachinePageProps {
  params: Promise<{ id: string }>;
}

export default function EditMachinePage({ params }: EditMachinePageProps) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [machine, setMachine] = useState<Machine | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    memo: '',
    isActive: true,
  });

  useEffect(() => {
    params.then(p => {
      setId(p.id);
      fetchMachine(p.id);
    });
  }, [params]);

  const fetchMachine = async (machineId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/machines/${machineId}`);
      const data = await response.json();

      if (data.success) {
        setMachine(data.data);
        setFormData({
          name: data.data.name,
          memo: data.data.memo || '',
          isActive: data.data.isActive,
        });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/machines/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          memo: formData.memo || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('機械を更新しました');
        router.push('/admin/machines');
      } else {
        setError(data.error || '機械の更新に失敗しました');
      }
    } catch (err) {
      setError('機械の更新に失敗しました');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">機械が見つかりません</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Link
            href="/admin/machines"
            className="text-blue-600 hover:text-blue-800"
          >
            ← 機械管理
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">機械編集</h1>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-6">
          {/* 機械名 */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              機械名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              maxLength={100}
            />
          </div>

          {/* メモ */}
          <div>
            <label htmlFor="memo" className="block text-sm font-medium text-gray-700 mb-2">
              メモ（任意）
            </label>
            <textarea
              id="memo"
              value={formData.memo}
              onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              maxLength={200}
            />
          </div>

          {/* アクティブフラグ */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
              有効（無効にすると日報入力時に選択できなくなります）
            </label>
          </div>
        </div>

        {/* ボタン */}
        <div className="mt-8 flex justify-end gap-4">
          <Link
            href="/admin/machines"
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
}

