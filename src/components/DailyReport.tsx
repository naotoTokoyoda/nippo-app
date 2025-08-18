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

  // 作業項目を追加する関数
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
    <div className="space-y-8">
      
      {/* 基本情報 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          基本情報
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      </div>

      {/* 作業者履歴表示 */}
      {reportData.workerName && (
        <div className="bg-blue-50 rounded-lg shadow-sm border border-blue-200">
          <WorkerHistory 
            workerName={reportData.workerName} 
            currentDate={reportData.date} 
          />
        </div>
      )}

      {/* 作業項目 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          作業項目
        </h2>
        
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
          
          {/* 新しい作業項目を追加するボタン */}
          <div className="text-center pt-4">
            <button
              onClick={addWorkItem}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              新しい作業項目を追加
            </button>
          </div>
        </div>
      </div>

      {/* 送信ボタン */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || showSuccess}
            className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold shadow-sm flex items-center justify-center mx-auto"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                送信中...
              </>
            ) : showSuccess ? (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                日報を送信しました！{countdown}秒後に一覧ページに移動します...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                日報を送信
              </>
            )}
          </button>

        </div>
      </div>
    </div>
  );
} 