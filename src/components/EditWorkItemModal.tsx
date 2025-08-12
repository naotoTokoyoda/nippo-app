'use client';

import { useState, useEffect } from 'react';

import DatabaseClientNameInput from './DatabaseClientNameInput';
import { WorkItemData } from '@/types/daily-report';

// WorkItemData型を使用するため、このインターフェースは削除
// interface WorkItem {
//   id: string;
//   name: string;
//   customerName: string;
//   workNumberFront: string;
//   workNumberBack: string;
//   startTime: string;
//   endTime: string;
//   machineType: string;
//   remarks: string;
//   workStatus: string;
// }

interface EditWorkItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  workItem: WorkItemData | null;
  reportId: string;
  availableCustomerNames: string[];
}

export default function EditWorkItemModal({
  isOpen,
  onClose,
  workItem,
  reportId,
  availableCustomerNames
}: EditWorkItemModalProps) {
  const [formData, setFormData] = useState<WorkItemData>({
    id: '',
    name: '',
    customerName: '',
    workNumberFront: '',
    workNumberBack: '',
    startTime: '',
    endTime: '',
    machineType: '',
    remarks: '',
    workStatus: 'normal'
  });

  // 作業項目が変更されたときにフォームデータを更新
  useEffect(() => {
    if (workItem) {
      setFormData(workItem);
    }
  }, [workItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workItem) return;

    try {
      // データベースで作業項目を更新
      const response = await fetch(`/api/reports/${reportId}/items/${workItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        onClose();
        // ページをリロードして最新データを表示
        window.location.reload();
      } else {
        alert('更新に失敗しました: ' + result.error);
      }
    } catch (error) {
      console.error('更新エラー:', error);
      alert('更新中にエラーが発生しました');
    }
  };

  const handleInputChange = (field: keyof WorkItemData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen || !workItem) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">作業項目を編集</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                作業名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="作業名称を入力"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                客先名 <span className="text-red-500">*</span>
              </label>
              <DatabaseClientNameInput
                value={formData.customerName}
                onChange={(value) => handleInputChange('customerName', value)}
                availableNames={availableCustomerNames}
                placeholder="客先名を入力"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                工番（前番） <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.workNumberFront}
                onChange={(e) => handleInputChange('workNumberFront', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="工番（前番）を入力"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                工番（後番）
              </label>
              <input
                type="text"
                value={formData.workNumberBack}
                onChange={(e) => handleInputChange('workNumberBack', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="工番（後番）を入力"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                開始時間 <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => handleInputChange('startTime', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                終了時間 <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => handleInputChange('endTime', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                機械種類 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.machineType}
                onChange={(e) => handleInputChange('machineType', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">選択してください</option>
                <option value="旋盤">旋盤</option>
                <option value="フライス盤">フライス盤</option>
                <option value="ボール盤">ボール盤</option>
                <option value="研削盤">研削盤</option>
                <option value="NC旋盤">NC旋盤</option>
                <option value="NCフライス盤">NCフライス盤</option>
                <option value="マシニングセンター">マシニングセンター</option>
                <option value="その他">その他</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                作業状況
              </label>
              <select
                value={formData.workStatus}
                onChange={(e) => handleInputChange('workStatus', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="completed">完了</option>
                <option value="working">作業中</option>
                <option value="break">休憩中</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              備考
            </label>
            <textarea
              value={formData.remarks}
              onChange={(e) => handleInputChange('remarks', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="備考があれば入力してください"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              更新
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
