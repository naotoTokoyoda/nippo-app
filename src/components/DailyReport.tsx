'use client';

import { useState } from 'react';
import WorkItem from '@/components/WorkItem';
import { useReports } from '@/contexts/ReportContext';
import { useRouter } from 'next/navigation';
import { calculateWorkTime, formatTime, formatDecimalTime } from '@/utils/timeCalculation';

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
  const { addReport } = useReports();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (!reportData.workerName) {
      alert('作業者名を選択してください');
      return;
    }

    if (reportData.workItems.length === 0) {
      alert('作業項目を追加してください');
      return;
    }

    setIsSubmitting(true);
    
    // 送信処理
    addReport(reportData);
    
    // 成功メッセージ
    alert('日報を送信しました！');
    
    // 一覧ページに遷移
    router.push('/reports');
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            作業者名
          </label>
          <select
            value={reportData.workerName}
            onChange={(e) => setReportData(prev => ({ ...prev, workerName: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">選択してください</option>
            {WORKER_OPTIONS.map(worker => (
              <option key={worker} value={worker}>{worker}</option>
            ))}
          </select>
        </div>
      </div>

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