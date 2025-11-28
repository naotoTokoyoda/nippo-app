'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Machine {
  id: string;
  name: string;
}

interface Rate {
  id: string;
  activity: string;
  activityType: string;
  displayName: string;
  machineId: string | null;
  costRate: number;
  billRate: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  memo: string | null;
  machine?: Machine;
}

interface EditMachineRatePageProps {
  params: Promise<{ id: string }>;
}

export default function EditMachineRatePage({ params }: EditMachineRatePageProps) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rate, setRate] = useState<Rate | null>(null);

  const [formData, setFormData] = useState({
    machineId: '',
    costRate: '',
    billRate: '',
    effectiveFrom: '',
    effectiveTo: '',
    memo: '',
  });

  useEffect(() => {
    const loadData = async () => {
      await fetchMachines();
      const p = await params;
      setId(p.id);
      await fetchRate(p.id);
    };
    loadData();
  }, [params]);

  const fetchMachines = async () => {
    try {
      const response = await fetch('/api/admin/machines');
      const data = await response.json();
      if (data.success) {
        setMachines(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch machines:', err);
    }
  };

  const fetchRate = async (rateId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/rates/${rateId}`);
      const data = await response.json();

      if (data.success) {
        setRate(data.data);
        const rateData = data.data;
        
        // 機械IDを確実に文字列として設定
        const machineId = rateData.machineId ? String(rateData.machineId) : '';
        
        setFormData({
          machineId: machineId,
          costRate: String(rateData.costRate),
          billRate: String(rateData.billRate),
          effectiveFrom: new Date(rateData.effectiveFrom).toISOString().split('T')[0],
          effectiveTo: rateData.effectiveTo ? new Date(rateData.effectiveTo).toISOString().split('T')[0] : '',
          memo: rateData.memo || '',
        });

        console.log('機械ID設定:', machineId); // デバッグ用
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
      const selectedMachine = machines.find(m => m.id === formData.machineId);
      if (!selectedMachine) {
        throw new Error('機械が選択されていません');
      }

      const response = await fetch(`/api/admin/rates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activity: `M_${selectedMachine.name.toUpperCase()}`,
          activityType: 'machine',
          displayName: selectedMachine.name,
          machineId: formData.machineId,
          costRate: parseFloat(formData.costRate),
          billRate: parseFloat(formData.billRate),
          effectiveFrom: new Date(formData.effectiveFrom).toISOString(),
          effectiveTo: formData.effectiveTo ? new Date(formData.effectiveTo).toISOString() : null,
          memo: formData.memo || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('機械単価を更新しました');
        router.push('/admin/rates/machine');
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
            href="/admin/rates/machine"
            className="text-gray-500 hover:text-gray-700"
          >
            ← 機械単価管理に戻る
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">機械単価編集</h1>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              機械 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.machineId}
              onChange={(e) => {
                console.log('機械変更:', e.target.value); // デバッグ用
                setFormData({ ...formData, machineId: e.target.value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">選択してください</option>
              {machines.map((machine) => (
                <option key={machine.id} value={machine.id}>
                  {machine.name}
                </option>
              ))}
            </select>
            {/* デバッグ情報 */}
            <p className="mt-1 text-xs text-gray-500">
              現在の機械ID: {formData.machineId || '（未選択）'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                原価単価（円/時間） <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.costRate}
                onChange={(e) => setFormData({ ...formData, costRate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                請求単価（円/時間） <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.billRate}
                onChange={(e) => setFormData({ ...formData, billRate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                適用開始日 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.effectiveFrom}
                onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                適用終了日（省略可）
              </label>
              <input
                type="date"
                value={formData.effectiveTo}
                onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
            <textarea
              value={formData.memo}
              onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              maxLength={200}
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
          <Link
            href="/admin/rates/machine"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}

