'use client';

import { useState } from 'react';
import WorkItem from '@/components/WorkItem';
import { useRouter } from 'next/navigation';
import { calculateWorkTime, formatTime, formatDecimalTime } from '@/utils/timeCalculation';
import { validateDailyReport, ValidationError } from '@/utils/validation';
import { useReportStore } from '@/stores/reportStore';

export interface WorkItemData {
  id: string;
  customerName: string;
  workNumberFront: string;
  workNumberBack: string;
  name: string;
  startTime: string;
  endTime: string;
  machineType: string;
  remarks: string;
}

export interface DailyReportData {
  id?: string;
  date: string;
  workerName: string;
  workItems: WorkItemData[];
  submittedAt?: string;
}

const WORKER_OPTIONS = [
  '橋本正朗',
  '常世田博',
  '野城喜幸',
  '三好耕平',
  '高梨純一',
  '金谷晶子',
  '（トン）シーワイ チャナラット',
  '（ポーン）テートシームアン タナーポーン',
  '（コー）ジャンペンペーン パッタウィ'
];

export default function DailyReport() {
  const addReport = useReportStore((state) => state.addReport);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [reportData, setReportData] = useState<DailyReportData>({
    date: new Date().toISOString().split('T')[0],
    workerName: '',
    workItems: [{
      id: '1',
      customerName: '',
      workNumberFront: '',
      workNumberBack: '',
      name: '',
      startTime: '',
      endTime: '',
      machineType: '',
      remarks: ''
    }]
  });

  const addWorkItem = () => {
    const newWorkItem: WorkItemData = {
      id: Date.now().toString(),
      customerName: '',
      workNumberFront: '',
      workNumberBack: '',
      name: '',
      startTime: '',
      endTime: '',
      machineType: '',
      remarks: ''
    };
    setReportData(prev => ({
      ...prev,
      workItems: [...prev.workItems, newWorkItem]
    }));
  };

  const updateWorkItem = (id: string, updatedItem: Partial<WorkItemData>) => {
    setReportData(prev => ({
      ...prev,
      workItems: prev.workItems.map(item =>
        item.id === id ? { ...item, ...updatedItem } : item
      )
    }));
  };

  const removeWorkItem = (id: string) => {
    setReportData(prev => ({
      ...prev,
      workItems: prev.workItems.filter(item => item.id !== id)
    }));
  };

  const calculateTotalTime = () => {
    return reportData.workItems.reduce((total, item) => {
      const workTime = calculateWorkTime(item.startTime, item.endTime, item.remarks);
      return total + workTime;
    }, 0);
  };

  const totalHours = calculateTotalTime();
  const totalDecimal = formatDecimalTime(totalHours);

  const handleSubmit = () => {
    // バリデーション実行
    const validation = validateDailyReport(reportData);
    
    if (!validation.success) {
      setShowValidation(true);
      setValidationErrors(validation.errors || []);
      return;
    }

    setIsSubmitting(true);
    
    // 送信処理
    addReport(reportData);
    
    // 成功メッセージを表示
    setShowSuccess(true);
    
    // 3秒後に一覧ページに遷移
    setTimeout(() => {
      router.push('/reports');
    }, 3000);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">日報</h1>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
          >
            ホーム
          </button>
          <button
            onClick={() => router.push('/reports')}
            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            一覧を見る
          </button>
        </div>
      </div>
      
      {/* 基本情報 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-6 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            日付
          </label>
          <input
            type="date"
            value={reportData.date}
            onChange={(e) => setReportData(prev => ({ ...prev, date: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              showValidation && validationErrors.some(err => err.field === 'date')
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {showValidation && validationErrors.some(err => err.field === 'date') && (
            <p className="text-xs text-red-600 mt-1">
              {validationErrors.find(err => err.field === 'date')?.message}
            </p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            作業者名
          </label>
          <select
            value={reportData.workerName}
            onChange={(e) => setReportData(prev => ({ ...prev, workerName: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              showValidation && validationErrors.some(err => err.field === 'workerName')
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          >
            <option value="">選択してください</option>
            {WORKER_OPTIONS.map(worker => (
              <option key={worker} value={worker}>{worker}</option>
            ))}
          </select>
          {showValidation && validationErrors.some(err => err.field === 'workerName') && (
            <p className="text-xs text-red-600 mt-1">
              {validationErrors.find(err => err.field === 'workerName')?.message}
            </p>
          )}
        </div>
      </div>

      {/* バリデーションエラー表示 */}
      {showValidation && validationErrors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center mb-2">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <h3 className="text-sm font-medium text-red-800">入力内容に誤りがあります</h3>
          </div>
          <ul className="text-sm text-red-700 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{error.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 成功メッセージ表示 */}
      {showSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center mb-2">
            <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h3 className="text-sm font-medium text-green-800">日報を送信しました！</h3>
          </div>
          <p className="text-sm text-green-700">3秒後に一覧ページに移動します...</p>
        </div>
      )}

      {/* 作業項目 */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">作業項目</h2>
        
        <div className="space-y-6">
          {reportData.workItems.map((item, index) => (
            <WorkItem
              key={item.id}
              item={item}
              index={index + 1}
              onUpdate={(updates) => updateWorkItem(item.id, updates)}
              onRemove={() => removeWorkItem(item.id)}
              showValidation={showValidation}
            />
          ))}
        </div>
        
        <div className="mt-6 text-center">
          <button
            onClick={addWorkItem}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            作業を追加
          </button>
        </div>
      </div>

      {/* 合計時間 */}
      {reportData.workItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-blue-50 rounded-lg mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              合計時間
            </label>
            <div className="text-2xl font-bold text-blue-600">
              {formatTime(totalHours)}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              10進数
            </label>
            <div className="text-2xl font-bold text-blue-600">
              {totalDecimal} 時間
            </div>
          </div>
        </div>
      )}

      {/* 送信ボタン */}
      <div className="text-center">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-8 py-4 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
        >
          {isSubmitting ? '送信中...' : '日報を送信'}
        </button>
      </div>
    </div>
  );
} 