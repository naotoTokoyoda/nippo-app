'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { calculateWorkTime, formatTime, formatDecimalTime } from '@/utils/timeCalculation';
import { getRowBackgroundClass } from '@/utils/conditionalFormatting';
import { useReportStore } from '@/stores/reportStore';

export default function ReportsPage() {
  const reports = useReportStore((state) => state.reports);
  const deleteReport = useReportStore((state) => state.deleteReport);
  const loadTestData = useReportStore((state) => state.loadTestData);
  const clearAllData = useReportStore((state) => state.clearAllData);
  const isTestDataLoaded = useReportStore((state) => state.isTestDataLoaded);
  
  const router = useRouter();
  
  // フィルタリング状態
  const [filters, setFilters] = useState({
    date: '',
    workerName: '',
    customerName: '',
    workNumberFront: ''
  });

  // フィルタリングされたレポート
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      if (filters.date && report.date !== filters.date) return false;
      if (filters.workerName && report.workerName !== filters.workerName) return false;
      if (filters.customerName) {
        const hasCustomer = report.workItems.some(item => 
          item.customerName.toLowerCase().includes(filters.customerName.toLowerCase())
        );
        if (!hasCustomer) return false;
      }
      if (filters.workNumberFront) {
        const hasWorkNumber = report.workItems.some(item => 
          item.workNumberFront === filters.workNumberFront
        );
        if (!hasWorkNumber) return false;
      }
      return true;
    });
  }, [reports, filters]);

  // ユニークな値の取得
  const uniqueWorkers = [...new Set(reports.map(r => r.workerName))].filter(Boolean);
  const uniqueWorkNumbers = [...new Set(reports.flatMap(r => r.workItems.map(w => w.workNumberFront)))].filter(Boolean);

  const calculateTotalTime = (workItems: { startTime: string; endTime: string; remarks: string }[]) => {
    return workItems.reduce((total, item) => {
      const workTime = calculateWorkTime(item.startTime, item.endTime, item.remarks);
      return total + workTime;
    }, 0);
  };

  const clearFilters = () => {
    setFilters({
      date: '',
      workerName: '',
      customerName: '',
      workNumberFront: ''
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-100 min-h-screen">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
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

        {/* フィルター */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">フィルター</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">日付</label>
              <input
                type="date"
                value={filters.date}
                onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">作業者名</label>
              <select
                value={filters.workerName}
                onChange={(e) => setFilters(prev => ({ ...prev, workerName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">すべて</option>
                {uniqueWorkers.map(worker => (
                  <option key={worker} value={worker}>{worker}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">客先名</label>
              <input
                type="text"
                value={filters.customerName}
                onChange={(e) => setFilters(prev => ({ ...prev, customerName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="部分一致検索"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">工番（前番）</label>
              <select
                value={filters.workNumberFront}
                onChange={(e) => setFilters(prev => ({ ...prev, workNumberFront: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">すべて</option>
                {uniqueWorkNumbers.map(number => (
                  <option key={number} value={number}>{number}</option>
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
          {filteredReports.length}件の日報が見つかりました
        </div>

        {/* 日報一覧 */}
        <div className="space-y-4">
          {filteredReports.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              日報が見つかりません
            </div>
          ) : (
            filteredReports.map((report) => {
              const totalHours = calculateTotalTime(report.workItems);
              return (
                <div key={report.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        {report.date} - {report.workerName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        作業項目: {report.workItems.length}件 | 合計時間: {formatTime(totalHours)} ({formatDecimalTime(totalHours)}時間)
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteReport(report.id!)}
                        className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-md transition-colors text-sm"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                  
                  {/* 作業項目の詳細表示 */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-2 py-2 text-left">客先名</th>
                          <th className="px-2 py-2 text-left">工番（前番）</th>
                          <th className="px-2 py-2 text-left">工番（後番）</th>
                          <th className="px-2 py-2 text-left">名称</th>
                          <th className="px-2 py-2 text-left">開始時間</th>
                          <th className="px-2 py-2 text-left">終了時間</th>
                          <th className="px-2 py-2 text-left">機械種類</th>
                          <th className="px-2 py-2 text-left">備考</th>
                          <th className="px-2 py-2 text-left">作業時間</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.workItems.map((item) => {
                          const workTime = calculateWorkTime(item.startTime, item.endTime, item.remarks);
                          const rowClass = getRowBackgroundClass(item.machineType, item.customerName);
                          return (
                            <tr key={item.id} className={`${rowClass} border-b border-gray-100`}>
                              <td className="px-2 py-2">{item.customerName || '未入力'}</td>
                              <td className="px-2 py-2">{item.workNumberFront}</td>
                              <td className="px-2 py-2">{item.workNumberBack}</td>
                              <td className="px-2 py-2">{item.name || '未入力'}</td>
                              <td className="px-2 py-2">{item.startTime || '未入力'}</td>
                              <td className="px-2 py-2">{item.endTime || '未入力'}</td>
                              <td className="px-2 py-2">{item.machineType || '未入力'}</td>
                              <td className="px-2 py-2">{item.remarks || '-'}</td>
                              <td className="px-2 py-2 font-medium">
                                {workTime > 0 ? `${formatTime(workTime)} (${formatDecimalTime(workTime)}時間)` : '0:00 (0.00時間)'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
} 