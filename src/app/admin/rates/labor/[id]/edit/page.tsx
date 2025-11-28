'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
}

interface EditLaborRatePageProps {
  params: Promise<{ id: string }>;
}

export default function EditLaborRatePage({ params }: EditLaborRatePageProps) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rate, setRate] = useState<Rate | null>(null);

  const [formData, setFormData] = useState({
    activity: '',
    displayName: '',
    costRate: '',
    billRate: '',
    effectiveFrom: '',
    effectiveTo: '',
    memo: '',
  });

  useEffect(() => {
    params.then(p => {
      setId(p.id);
      fetchRate(p.id);
    });
  }, [params]);

  const fetchRate = async (rateId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/rates/${rateId}`);
      const data = await response.json();

      if (data.success) {
        setRate(data.data);
        setFormData({
          activity: data.data.activity,
          displayName: data.data.displayName,
          costRate: String(data.data.costRate),
          billRate: String(data.data.billRate),
          effectiveFrom: new Date(data.data.effectiveFrom).toISOString().split('T')[0],
          effectiveTo: data.data.effectiveTo ? new Date(data.data.effectiveTo).toISOString().split('T')[0] : '',
          memo: data.data.memo || '',
        });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/rates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          activityType: 'labor',
          costRate: parseFloat(formData.costRate),
          billRate: parseFloat(formData.billRate),
          effectiveFrom: new Date(formData.effectiveFrom).toISOString(),
          effectiveTo: formData.effectiveTo ? new Date(formData.effectiveTo).toISOString() : null,
          memo: formData.memo || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('人工費単価を更新しました');
        router.push('/admin/rates/labor');
      } else {
        setError(data.error || '単価の更新に失敗しました');
      }
    } catch (err) {
      setError('単価の更新に失敗しました');
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

  if (!rate) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">単価が見つかりません</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Link
            href="/admin/rates/labor"
            className="text-gray-500 hover:text-gray-700"
          >
            ← 人工費単価管理に戻る
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">人工費単価編集</h1>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-6">
          {/* 表示名 */}
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
              表示名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="displayName"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              maxLength={100}
            />
          </div>

          {/* Activity */}
          <div>
            <label htmlFor="activity" className="block text-sm font-medium text-gray-700 mb-2">
              Activity <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="activity"
              value={formData.activity}
              onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              required
              maxLength={50}
            />
            <p className="mt-1 text-xs text-gray-500">
              集計システムで使用される内部識別子です
            </p>
          </div>

          {/* 原価単価 */}
          <div>
            <label htmlFor="costRate" className="block text-sm font-medium text-gray-700 mb-2">
              原価単価（円/時間） <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="costRate"
              value={formData.costRate}
              onChange={(e) => setFormData({ ...formData, costRate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              min="0"
              step="0.01"
            />
          </div>

          {/* 請求単価 */}
          <div>
            <label htmlFor="billRate" className="block text-sm font-medium text-gray-700 mb-2">
              請求単価（円/時間） <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="billRate"
              value={formData.billRate}
              onChange={(e) => setFormData({ ...formData, billRate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              min="0"
              step="0.01"
            />
          </div>

          {/* 有効開始日 */}
          <div>
            <label htmlFor="effectiveFrom" className="block text-sm font-medium text-gray-700 mb-2">
              有効開始日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="effectiveFrom"
              value={formData.effectiveFrom}
              onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* 有効終了日 */}
          <div>
            <label htmlFor="effectiveTo" className="block text-sm font-medium text-gray-700 mb-2">
              有効終了日（任意）
            </label>
            <input
              type="date"
              id="effectiveTo"
              value={formData.effectiveTo}
              onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              空欄の場合は無期限で有効です
            </p>
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
        </div>

        {/* ボタン */}
        <div className="mt-8 flex justify-end gap-4">
          <Link
            href="/admin/rates/labor"
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

