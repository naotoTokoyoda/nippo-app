'use client';

import { useState, useEffect, useMemo } from 'react';
import { calculateWorkTime, formatDecimalTime, getWorkStatusLabel } from '@/utils/timeCalculation';
import { DatabaseWorkItem } from '@/types/database';

interface AggregationWorkerHistoryProps {
  workNumberFront: string;
  workNumberBack: string;
}

export default function AggregationWorkerHistory({ 
  workNumberFront, 
  workNumberBack 
}: AggregationWorkerHistoryProps) {
  const [workHistory, setWorkHistory] = useState<DatabaseWorkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkHistory = async () => {
      try {
        setLoading(true);
        // 工番で絞り込んで作業履歴を取得
        const response = await fetch(
          `/api/reports?workNumberFront=${encodeURIComponent(workNumberFront)}&workNumberBack=${encodeURIComponent(workNumberBack)}&limit=100`
        );
        const result = await response.json();
        
        if (result.success) {
          // APIレスポンスの構造に対応: result.data.filteredItems または result.data が配列の場合
          const items = result.data?.filteredItems || result.filteredItems || result.data || [];
          setWorkHistory(items);
        } else {
          console.error('作業履歴取得エラー:', result.error);
          setWorkHistory([]);
        }
      } catch (error) {
        console.error('作業履歴取得エラー:', error);
        setWorkHistory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkHistory();
  }, [workNumberFront, workNumberBack]);

  // 作業者ごとにグループ化
  const groupedByWorker = useMemo(() => {
    const groups = new Map<string, DatabaseWorkItem[]>();
    workHistory.forEach(item => {
      if (!groups.has(item.workerName)) {
        groups.set(item.workerName, []);
      }
      groups.get(item.workerName)!.push(item);
    });
    return groups;
  }, [workHistory]);

  // 各作業者の合計時間を計算
  const workerTotals = useMemo(() => {
    const totals = new Map<string, number>();
    groupedByWorker.forEach((items, workerName) => {
      const total = items.reduce((sum, item) => {
        const workTime = calculateWorkTime(item.startTime, item.endTime, item.workStatus);
        return sum + workTime;
      }, 0);
      totals.set(workerName, total);
    });
    return totals;
  }, [groupedByWorker]);

  // 全体の総合作業時間を計算
  const grandTotal = useMemo(() => {
    return Array.from(workerTotals.values()).reduce((sum, total) => sum + total, 0);
  }, [workerTotals]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          作業者履歴
        </h3>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          作業者履歴 ({workHistory.length}件)
        </h3>
        <span className="text-sm text-gray-500">
          総合作業時間: {formatDecimalTime(grandTotal)}時間
        </span>
      </div>
      
      {groupedByWorker.size > 0 ? (
        <div className="space-y-6">
          {Array.from(groupedByWorker.entries())
            .sort(([, itemsA], [, itemsB]) => {
              // 作業者名でソート
              const nameA = itemsA[0]?.workerName || '';
              const nameB = itemsB[0]?.workerName || '';
              return nameA.localeCompare(nameB);
            })
            .map(([workerName, items]) => {
              const workerTotal = workerTotals.get(workerName) || 0;
              
              return (
                <div key={workerName} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">
                      {workerName} ({items.length}件)
                    </h4>
                    <span className="text-sm text-gray-600">
                      合計: {formatDecimalTime(workerTotal)}時間
                    </span>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm table-fixed">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="w-1/5 px-3 py-2 text-left font-medium text-gray-700">作業日</th>
                          <th className="w-1/4 px-3 py-2 text-left font-medium text-gray-700">時間</th>
                          <th className="w-[15%] px-3 py-2 text-left font-medium text-gray-700">勤務状況</th>
                          <th className="w-1/5 px-3 py-2 text-left font-medium text-gray-700">機械</th>
                          <th className="w-1/5 px-3 py-2 text-left font-medium text-gray-700">備考</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items
                          .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime())
                          .map((item) => {
                            const workTime = calculateWorkTime(item.startTime, item.endTime, item.workStatus);
                            
                            return (
                              <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-600">
                                  {new Date(item.reportDate).toLocaleDateString('ja-JP', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit'
                                  })}
                                </td>
                                <td className="px-3 py-2 text-gray-600">
                                  {item.startTime} - {item.endTime} ({formatDecimalTime(workTime)}時間)
                                </td>
                                <td className="px-3 py-2 text-gray-600">
                                  {getWorkStatusLabel(item.workStatus)}
                                </td>
                                <td className="px-3 py-2 text-gray-600">{item.machineType}</td>
                                <td className="px-3 py-2 text-gray-600">
                                  {item.remarks && item.remarks.trim() !== '' ? item.remarks : 'なし'}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-lg font-medium mb-2">作業履歴はありません</p>
          <p className="text-sm">日報で作業を入力すると、ここに履歴が表示されます</p>
        </div>
      )}
    </div>
  );
}
