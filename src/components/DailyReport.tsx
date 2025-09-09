'use client';

import { useState } from 'react';
import WorkItem from '@/components/WorkItem';
import WorkerHistory from '@/components/WorkerHistory';
import WorkNumberSearchSection from '@/components/WorkNumberSearchSection';
import { useRouter } from 'next/navigation';
// import { calculateWorkTime } from '@/utils/timeCalculation'; // 現在は使用されていない
import { validateDailyReport, validateBasicInfo } from '@/utils/validation';
import { getTodayInJST } from '@/utils/timeCalculation';

import { DailyReportData, WorkItemData, WORKER_OPTIONS, ValidationError } from '@/types/daily-report';
import React from 'react'; // Added missing import for React

export default function DailyReport() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [basicInfoErrors, setBasicInfoErrors] = useState<ValidationError[]>([]);
  // 既存日報の状態管理
  const [, setExistingReport] = useState<{
    exists: boolean;
    reportId?: string;
    workItems: WorkItemData[];
  }>({
    exists: false,
    workItems: []
  });
  
  const [reportData, setReportData] = useState<DailyReportData>({
    date: getTodayInJST(),
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

  // 工番検索結果から日報フィールドに自動入力
  const handleWorkInfoSelect = (workInfo: {
    customerName: string;
    workNumberFront: string;
    workNumberBack: string;
    workName: string;
  }) => {
    // 最初の作業項目に自動入力（空の場合のみ上書き）
    setReportData(prev => {
      const firstWorkItem = prev.workItems[0];
      if (firstWorkItem) {
        const updatedWorkItem = {
          ...firstWorkItem,
          customerName: workInfo.customerName || firstWorkItem.customerName,
          workNumberFront: workInfo.workNumberFront || firstWorkItem.workNumberFront,
          workNumberBack: workInfo.workNumberBack || firstWorkItem.workNumberBack,
          name: workInfo.workName || firstWorkItem.name
        };

        return {
          ...prev,
          workItems: [updatedWorkItem, ...prev.workItems.slice(1)]
        };
      }
      return prev;
    });

    // 成功メッセージを表示（オプション）
    if (typeof window !== 'undefined') {
      // Toast通知などを後で実装可能
      console.log('工番情報が自動入力されました:', workInfo);
    }
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
    } catch {
      
      setExistingReport({ exists: false, workItems: [] });
    }
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
        // 成功時に即座に日報一覧ページに遷移
        router.push('/reports');
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

      {/* 工番検索セクション */}
      <WorkNumberSearchSection onWorkInfoSelect={handleWorkInfoSelect} />

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
          

        </div>
      </div>

      {/* 送信ボタン */}
      <div className="">
        <div className="text-center">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || validationErrors.length > 0 || basicInfoErrors.length > 0}
            className={`px-8 py-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold shadow-sm flex items-center justify-center mx-auto ${
              validationErrors.length > 0 || basicInfoErrors.length > 0
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                送信中...
              </>
            ) : validationErrors.length > 0 || basicInfoErrors.length > 0 ? (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                エラーを修正してください
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