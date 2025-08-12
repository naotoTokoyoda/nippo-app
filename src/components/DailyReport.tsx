'use client';

import { useState } from 'react';
import WorkItem from '@/components/WorkItem';
import WorkerHistory from '@/components/WorkerHistory';
import { useRouter } from 'next/navigation';
import { calculateWorkTime } from '@/utils/timeCalculation';
import { validateDailyReport, validateBasicInfo } from '@/utils/validation';
import { useReportStore } from '@/stores/reportStore';
import { DailyReportData, WorkItemData, WORKER_OPTIONS, ValidationError } from '@/types/daily-report';
import { useCountdown } from '@/hooks/useCountdown';
import React from 'react'; // Added missing import for React

export default function DailyReport() {
  const addReport = useReportStore((state) => state.addReport);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [basicInfoErrors, setBasicInfoErrors] = useState<ValidationError[]>([]);
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
      workStatus: 'normal',
      remarks: ''
    }]
  });

  // カウントダウンとナビゲーション処理
  const { count: countdown, start: startCountdown } = useCountdown({
    initialCount: 3,
    onComplete: () => router.push('/reports'),
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
      workStatus: 'normal',
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
      const workTime = calculateWorkTime(item.startTime, item.endTime, item.workStatus);
      return total + workTime;
    }, 0);
  };

  // 基本情報のリアルタイムバリデーション
  React.useEffect(() => {
    // 最初にページを開いた時はエラーメッセージを表示しない
    if (!showValidation) {
      setBasicInfoErrors([]);
      return;
    }
    
    const validation = validateBasicInfo({
      date: reportData.date,
      workerName: reportData.workerName
    });
    
    if (!validation.success && validation.errors) {
      setBasicInfoErrors(validation.errors);
    } else {
      setBasicInfoErrors([]);
    }
  }, [reportData.date, reportData.workerName, showValidation]);

  // 作業項目のリアルタイムバリデーション
  React.useEffect(() => {
    // 最初にページを開いた時はエラーメッセージを表示しない
    if (!showValidation) {
      setValidationErrors([]);
      return;
    }
    
    const validation = validateDailyReport(reportData);
    
    if (!validation.success && validation.errors) {
      setValidationErrors(validation.errors);
    } else {
      setValidationErrors([]);
    }
  }, [reportData, showValidation]);

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
    startCountdown();
  };

  return (
    <div className="max-w-7xl mx-auto p-10 bg-white">

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
            data-field="date"
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-10 ${
              basicInfoErrors.some(err => err.field === 'date')
                ? 'border-red-500 focus:ring-red-500'
                : ''
            }`}
          />
          {basicInfoErrors.some(err => err.field === 'date') && (
            <p className="text-xs text-red-600 mt-1">
              {basicInfoErrors.find(err => err.field === 'date')?.message}
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
            data-field="workerName"
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-10 ${
              basicInfoErrors.some(err => err.field === 'workerName')
                ? 'border-red-500 focus:ring-red-500'
                : ''
            }`}
          >
            <option value=""></option>
            {WORKER_OPTIONS.map(worker => (
              <option key={worker} value={worker}>{worker}</option>
            ))}
          </select>
          {basicInfoErrors.some(err => err.field === 'workerName') && (
            <p className="text-xs text-red-600 mt-1">
              {basicInfoErrors.find(err => err.field === 'workerName')?.message}
            </p>
          )}
        </div>
      </div>



      {/* 作業者履歴表示 */}
      {reportData.workerName && (
        <WorkerHistory 
          workerName={reportData.workerName} 
          currentDate={reportData.date} 
        />
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
              workerName={reportData.workerName}
              currentDate={reportData.date}
              hideControls={true}
            />
          ))}
        </div>
      </div>



      {/* 送信ボタン */}
      <div className="text-center">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || showSuccess}
          className="px-8 py-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
        >
          {isSubmitting ? '送信中...' : showSuccess ? `日報を送信しました！${countdown}秒後に一覧ページに移動します...` : '日報を送信'}
        </button>
        {(validationErrors.length > 0 || basicInfoErrors.length > 0) && (
          <p className="text-xs text-red-600 mt-2">
            入力内容にエラーがあります。各項目をご確認ください。
          </p>
        )}
      </div>
    </div>
  );
} 