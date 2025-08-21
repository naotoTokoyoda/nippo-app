'use client';

import { useState, useEffect } from 'react';

import DatabaseClientNameInput from './DatabaseClientNameInput';
import { WorkItemData } from '@/types/daily-report';
import { generateTimeOptions } from '@/utils/timeCalculation';

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 作業項目が変更されたときにフォームデータを更新
  useEffect(() => {
    if (workItem) {
      setFormData(workItem);
    }
  }, [workItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workItem) return;

    setIsSubmitting(true);

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
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('更新エラー:', error);
      alert('更新中にエラーが発生しました');
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof WorkItemData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 15分刻みの時間選択肢を生成
  const mainWorkTimes = generateTimeOptions(8, 17).filter(time => {
    const [hour, minute] = time.split(':').map(Number);
    return hour < 17 || (hour === 17 && minute === 0);
  }); // 8:00-17:00まで
  
  const otherTimes = [
    ...generateTimeOptions(0, 7),   // 0:00-7:45
    ...generateTimeOptions(17, 17).filter(time => time !== '17:00'), // 17:15, 17:30, 17:45
    ...generateTimeOptions(18, 23)  // 18:00-23:45
  ];

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
              <select
                value={formData.startTime}
                onChange={(e) => handleInputChange('startTime', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value=""></option>
                <optgroup label="メイン稼働時間 (8:00-17:00)">
                  {mainWorkTimes.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </optgroup>
                <optgroup label="その他 (0:00-7:45, 17:00-23:45)">
                  {otherTimes.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                終了時間 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.endTime}
                onChange={(e) => handleInputChange('endTime', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value=""></option>
                <optgroup label="メイン稼働時間 (8:00-17:00)">
                  {mainWorkTimes.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </optgroup>
                <optgroup label="その他 (0:00-7:45, 17:00-23:45)">
                  {otherTimes.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </optgroup>
              </select>
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
                <option value=""></option>
                <option value="MILLAC 1052 VII">MILLAC 1052 VII</option>
                <option value="MILLAC 761 VII">MILLAC 761 VII</option>
                <option value="250 : NC旋盤マザック">250 : NC旋盤マザック</option>
                <option value="350 : NC旋盤マザック">350 : NC旋盤マザック</option>
                <option value="スマート250 L : NC旋盤">スマート250 L : NC旋盤</option>
                <option value="Mazak REX">Mazak REX</option>
                <option value="Mazatrol M-32">Mazatrol M-32</option>
                <option value="正面盤 : Chubu LF 500">正面盤 : Chubu LF 500</option>
                <option value="12尺 : 汎用旋盤">12尺 : 汎用旋盤</option>
                <option value="汎用旋盤">汎用旋盤</option>
                <option value="溶接">溶接</option>
                <option value="該当なし">該当なし</option>
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
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  送信中...
                </>
              ) : (
                '更新'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
