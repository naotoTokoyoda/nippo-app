'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { calculateWorkTime, formatTime, formatDecimalTime } from '@/utils/timeCalculation';
import { getRowBackgroundClass } from '@/utils/conditionalFormatting';
import { useReportStore } from '@/stores/reportStore';
import DatabaseClientNameInput from './DatabaseClientNameInput';
import EditWorkItemModal from './EditWorkItemModal';
import { WorkItemData } from '@/types/daily-report';


export default function ReportsList() {
  const reports = useReportStore((state) => state.reports);
  
  const router = useRouter();
  
  // 編集モーダルの状態
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedWorkItem, setSelectedWorkItem] = useState<WorkItemData | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  
  // 利用可能な年月の取得
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    reports.forEach(report => {
      if (report.date) {
        const yearMonth = report.date.substring(0, 7); // YYYY-MM形式
        months.add(yearMonth);
      }
    });
    return Array.from(months).sort().reverse(); // 新しい順にソート
  }, [reports]);

  // 現在の年月を取得
  const currentYearMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // フィルタリング状態（デフォルトを当月に設定）
  const [filters, setFilters] = useState({
    month: currentYearMonth, // デフォルトを当月に設定
    workerName: '',
    customerName: '',
    workNumberFront: '',
    workNumberBack: '',
    machineType: ''
  });

  // 全作業項目をフラット化して取得
  const allWorkItems = useMemo(() => {
    return reports.flatMap(report => 
      report.workItems.map(item => ({
        ...item,
        reportId: report.id,
        reportDate: report.date,
        workerName: report.workerName
      }))
    );
  }, [reports]);

  // フィルタリングされた作業項目
  const filteredWorkItems = useMemo(() => {
    return allWorkItems.filter(item => {
      // 月フィルターは常に適用（デフォルトは当月）
      if (item.reportDate) {
        const itemYearMonth = item.reportDate.substring(0, 7); // YYYY-MM形式
        if (itemYearMonth !== filters.month) return false;
      }
      if (filters.workerName && item.workerName !== filters.workerName) return false;
      if (filters.customerName) {
        if (!item.customerName.toLowerCase().includes(filters.customerName.toLowerCase())) return false;
      }
      if (filters.workNumberFront && item.workNumberFront !== filters.workNumberFront) return false;
      if (filters.workNumberBack) {
        if (!item.workNumberBack.toLowerCase().includes(filters.workNumberBack.toLowerCase())) return false;
      }
      if (filters.machineType && item.machineType !== filters.machineType) return false;
      return true;
    });
  }, [allWorkItems, filters]);

  // ユニークな値の取得
  const uniqueWorkers = [...new Set(reports.map(r => r.workerName))].filter(Boolean);
  const uniqueCustomerNames = [...new Set(allWorkItems.map(w => w.customerName))].filter(Boolean);
  const uniqueWorkNumbers = [...new Set(allWorkItems.map(w => w.workNumberFront))].filter(Boolean);
  const uniqueMachineTypes = [...new Set(allWorkItems.map(w => w.machineType))].filter(Boolean);

  const clearFilters = () => {
    setFilters({
      month: currentYearMonth,
      workerName: '',
      customerName: '',
      workNumberFront: '',
      workNumberBack: '',
      machineType: ''
    });
  };

  // 編集モーダルを開く
  const handleEditWorkItem = (workItem: WorkItemData, reportId: string) => {
    setSelectedWorkItem(workItem);
    setSelectedReportId(reportId);
    setIsEditModalOpen(true);
  };

  // 編集モーダルを閉じる
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedWorkItem(null);
    setSelectedReportId('');
  };

  return (
    <div className="max-w-7xl mx-auto p-10 bg-gray-100">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">日報一覧</h1>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
          >
            ホーム
          </button>
          <button
            onClick={() => router.push('/daily-report')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            新規作成
          </button>
        </div>
      </div>

      {/* 開発環境でのみテストデータ管理を表示 */}


      {/* フィルター */}
      <div className="mb-8 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">フィルター</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">年月</label>
            <select
              value={filters.month}
              onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))}
              className="w-full px-3 py-2 h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              {availableMonths.map(month => {
                const [year, monthNum] = month.split('-');
                const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
                return (
                  <option key={month} value={month}>{monthName}</option>
                );
              })}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">作業者名</label>
            <select
              value={filters.workerName}
              onChange={(e) => setFilters(prev => ({ ...prev, workerName: e.target.value }))}
              className="w-full px-3 py-2 h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">すべて</option>
              {uniqueWorkers.map(worker => (
                <option key={worker} value={worker}>{worker}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">客先名</label>
            <DatabaseClientNameInput
              value={filters.customerName}
              onChange={(value) => setFilters(prev => ({ ...prev, customerName: value }))}
              availableNames={uniqueCustomerNames}
              placeholder="客先名を入力"
              className="text-gray-900 h-10"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">工番（前番）</label>
            <select
              value={filters.workNumberFront}
              onChange={(e) => setFilters(prev => ({ ...prev, workNumberFront: e.target.value }))}
              className="w-full px-3 py-2 h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">すべて</option>
              {uniqueWorkNumbers.map(number => (
                <option key={number} value={number}>{number}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">工番（後番）</label>
            <input
              type="text"
              value={filters.workNumberBack}
              onChange={(e) => setFilters(prev => ({ ...prev, workNumberBack: e.target.value }))}
              placeholder="工番（後番）を入力"
              className="w-full px-3 py-2 h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">機械種類</label>
            <select
              value={filters.machineType}
              onChange={(e) => setFilters(prev => ({ ...prev, machineType: e.target.value }))}
              className="w-full px-3 py-2 h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">すべて</option>
              {uniqueMachineTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mt-4">
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
          >
            フィルターをクリア
          </button>
        </div>
      </div>

      {/* 結果件数 */}
      <div className="mb-4 text-sm text-gray-600">
        {filteredWorkItems.length}件の作業項目が見つかりました
      </div>

      {/* 作業項目一覧テーブル */}
      <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="min-w-max">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-3 text-left font-medium text-gray-700 sticky top-0 bg-gray-50 whitespace-nowrap">No</th>
                <th className="px-3 py-3 text-left font-medium text-gray-700 sticky top-0 bg-gray-50 whitespace-nowrap">客先名</th>
                <th className="px-3 py-3 text-left font-medium text-gray-700 sticky top-0 bg-gray-50 whitespace-nowrap">工番（前番）</th>
                <th className="px-3 py-3 text-left font-medium text-gray-700 sticky top-0 bg-gray-50 whitespace-nowrap">工番（後番）</th>
                <th className="px-3 py-3 text-left font-medium text-gray-700 sticky top-0 bg-gray-50 whitespace-nowrap">作業名称</th>
                <th className="px-3 py-3 text-left font-medium text-gray-700 sticky top-0 bg-gray-50 whitespace-nowrap">作業者名</th>
                <th className="px-3 py-3 text-left font-medium text-gray-700 sticky top-0 bg-gray-50 whitespace-nowrap">開始時間</th>
                <th className="px-3 py-3 text-left font-medium text-gray-700 sticky top-0 bg-gray-50 whitespace-nowrap">終了時間</th>
                <th className="px-3 py-3 text-left font-medium text-gray-700 sticky top-0 bg-gray-50 whitespace-nowrap">機械種類</th>
                <th className="px-3 py-3 text-left font-medium text-gray-700 sticky top-0 bg-gray-50 whitespace-nowrap">備考</th>
                <th className="px-3 py-3 text-left font-medium text-gray-700 sticky top-0 bg-gray-50 whitespace-nowrap">作業時間</th>
                <th className="px-3 py-3 text-left font-medium text-gray-700 sticky top-0 bg-gray-50 whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="max-h-96 overflow-y-auto">
              {filteredWorkItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-3 py-8 text-center text-gray-500">
                    作業項目が見つかりません
                  </td>
                </tr>
              ) : (
                filteredWorkItems.map((item, index) => {
                  const workTime = calculateWorkTime(item.startTime, item.endTime, item.workStatus);
                  const rowClass = getRowBackgroundClass(item.machineType, item.customerName);
                  return (
                    <tr key={`${item.reportId}-${item.id}`} className={`${rowClass} border-b border-gray-200 hover:bg-gray-50`}>
                      <td className="px-3 py-3 text-gray-900 whitespace-nowrap font-medium">{index + 1}</td>
                      <td className="px-3 py-3 text-gray-900 whitespace-nowrap">{item.customerName || '未入力'}</td>
                      <td className="px-3 py-3 text-gray-900 whitespace-nowrap">{item.workNumberFront}</td>
                      <td className="px-3 py-3 text-gray-900 whitespace-nowrap">{item.workNumberBack}</td>
                      <td className="px-3 py-3 text-gray-900 whitespace-nowrap">{item.name || '未入力'}</td>
                      <td className="px-3 py-3 text-gray-900 whitespace-nowrap">{item.workerName}</td>
                      <td className="px-3 py-3 text-gray-900 whitespace-nowrap">{item.startTime || '未入力'}</td>
                      <td className="px-3 py-3 text-gray-900 whitespace-nowrap">{item.endTime || '未入力'}</td>
                      <td className="px-3 py-3 text-gray-900 whitespace-nowrap">{item.machineType || '未入力'}</td>
                      <td className="px-3 py-3 text-gray-900 whitespace-nowrap">{item.remarks || '-'}</td>
                      <td className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap">
                        {workTime > 0 ? `${formatTime(workTime)} (${formatDecimalTime(workTime)}時間)` : '0:00 (0.00時間)'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <button
                          onClick={() => handleEditWorkItem(item, item.reportId!)}
                          className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs transition-colors"
                        >
                          編集
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 編集モーダル */}
      <EditWorkItemModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        workItem={selectedWorkItem}
        reportId={selectedReportId}
        availableCustomerNames={uniqueCustomerNames}
      />
    </div>
  );
} 