'use client';

import { useState } from 'react';
import WorkItem from '@/components/WorkItem';
import WorkerHistory from '@/components/WorkerHistory';
import { useRouter } from 'next/navigation';
// import { calculateWorkTime } from '@/utils/timeCalculation'; // 現在は使用されていない
import { validateDailyReport, validateBasicInfo } from '@/utils/validation';

import { DailyReportData, WorkItemData, WORKER_OPTIONS, ValidationError } from '@/types/daily-report';
import { useCountdown } from '@/hooks/useCountdown';
import React from 'react'; // Added missing import for React

export default function DailyReport() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [basicInfoErrors, setBasicInfoErrors] = useState<ValidationError[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // 既存日報の状態管理
  const [existingReport, setExistingReport] = useState<{
    exists: boolean;
    reportId?: string;
    workItems: WorkItemData[];
  }>({
    exists: false,
    workItems: []
  });
  
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
  const { count: countdown, start: startCountdown, stop: stopCountdown } = useCountdown({
    initialCount: 3,
    onComplete: () => {
      // カウントダウン完了時にナビゲーション
      router.push('/reports');
    },
  });

  // コンポーネントのアンマウント時にカウントダウンを停止
  React.useEffect(() => {
    return () => {
      stopCountdown();
    };
  }, [stopCountdown]);

  // 作業項目を追加する関数（現在は使用されていないが、将来の機能拡張のために残す）
  // const addWorkItem = () => {
  //   const newWorkItem: WorkItemData = {
  //     id: Date.now().toString(),
  //     customerName: '',
  //     workNumberFront: '',
  //     workNumberBack: '',
  //     name: '',
  //     startTime: '',
  //     endTime: '',
  //     machineType: '',
  //     workStatus: 'normal',
  //     remarks: ''
  //   };
  //   setReportData(prev => ({
  //     ...prev,
  //     workItems: [...prev.workItems, newWorkItem]
  //   }));
  // };

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

  // 既存日報をチェックする関数
  const checkExistingReport = async (date: string, workerName: string) => {
    if (!date || !workerName) {
      setExistingReport({ exists: false, workItems: [] });
      return;
    }

    try {
      const response = await fetch(`/api/reports?workerName=${encodeURIComponent(workerName)}&month=${date.substring(0, 7)}`);
      const result = await response.json();

      if (result.success && result.filteredItems) {
        // 指定された日付の作業項目をフィルタリング
        const dayItems = result.filteredItems.filter((item: { reportDate: string }) => 
          item.reportDate === date
        );

        if (dayItems.length > 0) {
          // 既存日報が存在する場合
          const reportId = dayItems[0].reportId;
          setExistingReport({
            exists: true,
            reportId,
            workItems: dayItems.map((item: { 
              id: string;
              customerName: string;
              workNumberFront: string;
              workNumberBack: string;
              name: string;
              startTime: string;
              endTime: string;
              machineType: string;
              workStatus?: string;
              remarks?: string;
            }) => ({
              id: item.id,
              customerName: item.customerName,
              workNumberFront: item.workNumberFront,
              workNumberBack: item.workNumberBack,
              name: item.name,
              startTime: item.startTime,
              endTime: item.endTime,
              machineType: item.machineType,
              workStatus: item.workStatus || 'normal',
              remarks: item.remarks || ''
            }))
          });
        } else {
          setExistingReport({ exists: false, workItems: [] });
        }
      } else {
        setExistingReport({ exists: false, workItems: [] });
      }
    } catch (error) {
      console.error('既存日報チェックエラー:', error);
      setExistingReport({ exists: false, workItems: [] });
    }
  };

  // 合計作業時間を計算する関数（現在は使用されていないが、将来の機能拡張のために残す）
  // const calculateTotalTime = () => {
  //   return reportData.workItems.reduce((total, item) => {
  //     const workTime = calculateWorkTime(item.startTime, item.endTime, item.workStatus);
  //     return total + workTime;
  //   }, 0);
  // };

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

  // 日付と作業者名が変更された時に既存日報をチェック
  React.useEffect(() => {
    if (reportData.date && reportData.workerName) {
      checkExistingReport(reportData.date, reportData.workerName);
    } else {
      setExistingReport({ exists: false, workItems: [] });
    }
  }, [reportData.date, reportData.workerName]);

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

  const handleSubmit = async () => {
    // バリデーション実行
    const validation = validateDailyReport(reportData);
    
    if (!validation.success) {
      setShowValidation(true);
      setValidationErrors(validation.errors || []);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // データベースに保存
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });

      const result = await response.json();

      if (result.success) {
        // 成功メッセージを表示
        setShowSuccess(true);
        startCountdown();
      } else {
        // エラーハンドリング
        console.error('保存エラー:', result.error);
        alert('日報の保存に失敗しました: ' + result.error);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('送信エラー:', error);
      alert('日報の送信中にエラーが発生しました');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-10 bg-white relative z-10">

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

      {/* 既存日報の警告 */}
      {existingReport.exists && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <span className="text-sm font-medium text-yellow-800">
                既存の日報が存在します
              </span>
              <p className="text-xs text-yellow-600 mt-1">
                {reportData.date} に {reportData.workerName} の日報が既に存在します。
                新しい作業項目を追加する場合は、既存の日報に追加されます。
              </p>
            </div>
          </div>
        </div>
      )}

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