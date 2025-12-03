'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';

interface ExpenseRate {
  id: string;
  categoryName: string;
  markupRate: number;
  memo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  categoryName: string;
  markupRate: string;
  memo: string;
}

export default function ExpenseRatesPage() {
  const { showToast } = useToast();
  const [rates, setRates] = useState<ExpenseRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedRate, setSelectedRate] = useState<ExpenseRate | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [rateToDelete, setRateToDelete] = useState<ExpenseRate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    categoryName: '',
    markupRate: '20',
    memo: '',
  });

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/expense-rates');
      const data = await response.json();

      if (data.success) {
        setRates(data.data);
        setError(null);
      } else {
        setError(data.error || '経費率の取得に失敗しました');
      }
    } catch (err) {
      setError('経費率の取得に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedRate(null);
    setFormData({ categoryName: '', markupRate: '20', memo: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (rate: ExpenseRate) => {
    setModalMode('edit');
    setSelectedRate(rate);
    const percentValue = ((Number(rate.markupRate) - 1) * 100).toFixed(2);
    setFormData({
      categoryName: rate.categoryName,
      markupRate: percentValue,
      memo: rate.memo || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRate(null);
    setFormData({ categoryName: '', markupRate: '20', memo: '' });
  };

  const openDeleteModal = (rate: ExpenseRate) => {
    setRateToDelete(rate);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setRateToDelete(null);
  };

  const handleSubmit = async () => {
    const markupValue = parseFloat(formData.markupRate);
    if (isNaN(markupValue) || markupValue < 0 || markupValue > 100) {
      showToast('経費率は0〜100の範囲で入力してください', 'error');
      return;
    }

    if (!formData.categoryName.trim()) {
      showToast('カテゴリ名を入力してください', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const rateMultiplier = 1 + (markupValue / 100);
      const url = modalMode === 'create' 
        ? '/api/admin/expense-rates'
        : `/api/admin/expense-rates/${selectedRate?.id}`;
      
      const method = modalMode === 'create' ? 'POST' : 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryName: formData.categoryName,
          markupRate: rateMultiplier,
          memo: formData.memo || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showToast(
          modalMode === 'create' ? '経費率を作成しました' : '経費率を更新しました',
          'success'
        );
        closeModal();
        fetchRates();
      } else {
        showToast(result.error || `経費率の${modalMode === 'create' ? '作成' : '更新'}に失敗しました`, 'error');
      }
    } catch (err) {
      showToast(`経費率の${modalMode === 'create' ? '作成' : '更新'}に失敗しました`, 'error');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!rateToDelete) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/expense-rates/${rateToDelete.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        showToast('経費率を削除しました', 'success');
        closeDeleteModal();
        fetchRates();
      } else {
        showToast(result.error || '経費率の削除に失敗しました', 'error');
      }
    } catch (err) {
      showToast('経費率の削除に失敗しました', 'error');
      console.error(err);
    } finally {
      setIsDeleting(false);
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">経費率管理</h1>
          <p className="mt-2 text-sm text-gray-600">
            経費カテゴリごとの原価に対する上乗せ率（%）を管理します
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 新規追加
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* 説明 */}
      <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong className="font-semibold">💡 経費率について</strong><br />
          経費率は、集計詳細画面の経費明細で使用されます。<br />
          例：材料費の原価が10,000円、経費率が20%の場合 → 請求額は12,000円（10,000円 × 1.20）
        </p>
      </div>

      {/* 経費率一覧 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                カテゴリ名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                経費率
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
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  経費率が登録されていません
                </td>
              </tr>
            ) : (
              rates.map((rate) => (
                <tr key={rate.id}>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {rate.categoryName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {((Number(rate.markupRate) - 1) * 100).toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {rate.memo || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(rate)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => openDeleteModal(rate)}
                        className="text-red-600 hover:text-red-800 font-medium"
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

      {/* 編集/新規作成モーダル */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {modalMode === 'create' ? '新規経費率' : '経費率編集'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    カテゴリ名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.categoryName}
                    onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例：材料費"
                    maxLength={100}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    経費率（%） <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.markupRate}
                    onChange={(e) => setFormData({ ...formData, markupRate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    max="100"
                    step="0.01"
                    disabled={isSubmitting}
                  />
                  <p className="mt-1 text-xs text-gray-500">0〜100の範囲で入力</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    メモ（任意）
                  </label>
                  <textarea
                    value={formData.memo}
                    onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    maxLength={200}
                    rows={3}
                    placeholder="備考など"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  {isSubmitting 
                    ? (modalMode === 'create' ? '作成中...' : '更新中...') 
                    : (modalMode === 'create' ? '作成' : '更新')
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {isDeleteModalOpen && rateToDelete && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={closeDeleteModal}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                経費率の削除
              </h2>
              
              <p className="text-gray-700 mb-2">
                「<strong>{rateToDelete.categoryName}</strong>」を削除してもよろしいですか？
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  ※ データは論理削除され、過去の集計データには影響しません。
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={closeDeleteModal}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isDeleting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  {isDeleting ? '削除中...' : '削除する'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
