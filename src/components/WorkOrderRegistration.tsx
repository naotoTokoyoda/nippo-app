'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/PageLayout';

interface WorkOrderFormData {
  frontNumber: string;
  backNumber: string;
  customerId: string;
  customerName: string;
  handling: string;
  projectName: string;
  quantity: number | null;
}

export default function WorkOrderRegistration() {
  const router = useRouter();
  const [formData, setFormData] = useState<WorkOrderFormData>({
    frontNumber: '',
    backNumber: '',
    customerId: '',
    customerName: '',
    handling: '',
    projectName: '',
    quantity: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ダミー顧客データ（後で実際のAPIから取得）
  const customers = [
    { id: '1', name: '○○製鉄株式会社', code: 'ST001' },
    { id: '2', name: 'JFE△△製鉄', code: 'JFE001' },
    { id: '3', name: '□□鉄鋼工業', code: 'TK001' },
  ];

  const handleInputChange = (field: keyof WorkOrderFormData, value: string | number | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // エラーをクリア
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleCustomerChange = (customerId: string) => {
    const selectedCustomer = customers.find(c => c.id === customerId);
    setFormData(prev => ({
      ...prev,
      customerId,
      customerName: selectedCustomer?.name || ''
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.frontNumber.trim()) {
      newErrors.frontNumber = '工番（前番）は必須です';
    } else if (!/^\d{4}$/.test(formData.frontNumber)) {
      newErrors.frontNumber = '工番（前番）は4桁の数字で入力してください';
    }

    if (!formData.backNumber.trim()) {
      newErrors.backNumber = '工番（後番）は必須です';
    }

    if (!formData.customerId) {
      newErrors.customerId = '顧客は必須です';
    }

    if (!formData.projectName.trim()) {
      newErrors.projectName = '作業名称は必須です';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      // TODO: 実際のAPI呼び出しに変更
      console.log('登録データ:', formData);
      
      // 仮の処理（成功をシミュレート）
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('工番が正常に登録されました');
      router.push('/aggregation');
    } catch (error) {
      console.error('登録エラー:', error);
      alert('登録中にエラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/aggregation');
  };

  return (
    <PageLayout title="工番登録">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 工番（前番・後番） */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  工番（前番） <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.frontNumber}
                  onChange={(e) => handleInputChange('frontNumber', e.target.value)}
                  placeholder="例: 5927"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.frontNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.frontNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.frontNumber}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  工番（後番） <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.backNumber}
                  onChange={(e) => handleInputChange('backNumber', e.target.value)}
                  placeholder="例: 12120, J-726"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.backNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.backNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.backNumber}</p>
                )}
              </div>
            </div>

            {/* 顧客選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                顧客 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.customerId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">顧客を選択してください</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} ({customer.code})
                  </option>
                ))}
              </select>
              {errors.customerId && (
                <p className="mt-1 text-sm text-red-600">{errors.customerId}</p>
              )}
            </div>

            {/* 扱い */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                扱い
              </label>
              <input
                type="text"
                value={formData.handling}
                onChange={(e) => handleInputChange('handling', e.target.value)}
                placeholder="任意入力"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 作業名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                作業名称（案件名） <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.projectName}
                onChange={(e) => handleInputChange('projectName', e.target.value)}
                placeholder="例: 高炉設備メンテナンス"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.projectName ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.projectName && (
                <p className="mt-1 text-sm text-red-600">{errors.projectName}</p>
              )}
            </div>

            {/* 数量 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                数量
              </label>
              <input
                type="number"
                value={formData.quantity || ''}
                onChange={(e) => handleInputChange('quantity', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="任意入力（集計には影響しません）"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* ボタン */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '登録中...' : '登録'}
              </button>
            </div>
          </form>
        </div>

        {/* 注意事項 */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">注意事項</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>この機能はJooto API連携の代替機能です</li>
                  <li>Phase 3実装後は、Jooto同期により自動登録されます</li>
                  <li>期区分は工番パターンから自動判定されます</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
