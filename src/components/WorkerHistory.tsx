'use client';

import { useMemo, useState, useEffect } from 'react';
import { calculateWorkTime, formatTime, formatDecimalTime, calculateNonOverlappingWorkTime } from '@/utils/timeCalculation';
import { DatabaseReport, DatabaseWorkItem } from '@/types/database';

interface WorkerHistoryProps {
  workerName: string;
  currentDate: string;
}

export default function WorkerHistory({ workerName, currentDate }: WorkerHistoryProps) {
  const [reports, setReports] = useState<DatabaseReport[]>([]);
  const [loading, setLoading] = useState(true);

  // データベースから作業者のレポートを取得
  useEffect(() => {
    const fetchWorkerReports = async () => {
      if (!workerName) {
        setReports([]);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/reports?workerName=${encodeURIComponent(workerName)}`);
        const result = await response.json();

        if (result.success) {
          // APIの新しい形式に対応：filteredItemsからDatabaseReport形式に変換
          const workItems = result.filteredItems || [];
          
          // reportIdでグループ化してDatabaseReport形式に変換
          const reportsMap = new Map<string, DatabaseReport>();
          
          workItems.forEach((item: DatabaseWorkItem) => {
            const reportId = item.reportId;
            if (!reportsMap.has(reportId)) {
              reportsMap.set(reportId, {
                id: reportId,
                date: item.reportDate,
                workerName: item.workerName,
                submittedAt: '', // このデータは現在のAPIでは取得できない
                workItems: []
              });
            }
            
            // 作業項目をレポートに追加
            reportsMap.get(reportId)!.workItems.push(item);
          });
          
          const reports = Array.from(reportsMap.values());
          setReports(reports);
        } else {
          setReports([]);
        }
      } catch (error) {
        console.error('作業者履歴取得エラー:', error);
        setReports([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkerReports();
  }, [workerName]);

  // 指定された作業者の最新の投稿を取得
  const latestReport = useMemo(() => {
    if (!workerName || loading) return null;
    
    const workerReports = reports
      .filter((report: DatabaseReport) => report.workerName === workerName)
      .sort((a: DatabaseReport, b: DatabaseReport) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return workerReports.length > 0 ? workerReports[0] : null;
  }, [reports, workerName, loading]);

  // 今日の投稿があるかチェック
  const hasTodayReport = useMemo(() => {
    if (!workerName || !currentDate || loading) return false;
    return reports.some((report: DatabaseReport) => 
      report.workerName === workerName && report.date === currentDate
    );
  }, [reports, workerName, currentDate, loading]);

  // 指定された日付の投稿を取得
  const todayReport = useMemo(() => {
    if (!workerName || !currentDate || loading) return null;
    
    // 同じ日付の複数のレポートを取得
    const todayReports = reports.filter((report: DatabaseReport) => 
      report.workerName === workerName && report.date === currentDate
    );
    
    // 複数のレポートがある場合は、すべての作業項目を統合した仮想的なレポートを作成
    if (todayReports.length > 0) {
      const allWorkItems = todayReports.flatMap((report: DatabaseReport) => 
        report.workItems.map((item) => ({
          ...item,
          // ユニークなキーを生成するためにレポートIDを追加
          uniqueId: `${report.id}-${item.id}`
        }))
      );
      return {
        id: 'combined',
        date: currentDate,
        workerName: workerName,
        workItems: allWorkItems,
        submittedAt: todayReports[0].submittedAt
      };
    }
    
    return null;
  }, [reports, workerName, currentDate, loading]);

  // 今日の合計作業時間を計算（分単位、重複時間を除去）
  const todayTotalTime = useMemo(() => {
    if (!todayReport) return 0;
    
    // 重複を除去した実際の作業時間を計算
    const actualWorkTimeHours = calculateNonOverlappingWorkTime(todayReport.workItems);
    
    return actualWorkTimeHours * 60; // 時間を分に変換
  }, [todayReport]);

  // 8時間労働のチェック
  const isEightHoursComplete = todayTotalTime >= 8 * 60; // 8時間 = 480分

  // 日付を日本語形式に変換
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    return `${month}/${day}(${weekday})`;
  };

  if (!workerName) return null;

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
        <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        作業者履歴: {workerName}
      </h3>
      
      {/* ローディング表示 */}
      {loading && (
        <div className="flex flex-col items-center space-y-4 py-8">
          {/* スピナー */}
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-600">データを読み込み中...</p>
        </div>
      )}
      
      {/* データ読み込み完了後の表示 */}
      {!loading && (
        <>
      
      {/* 8時間労働の警告 */}
      {hasTodayReport && !isEightHoursComplete && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <span className="text-sm font-medium text-red-800">
                8時間労働が未完了です
              </span>
              <p className="text-xs text-red-600 mt-1">
                現在の合計作業時間: {formatTime(todayTotalTime / 60)} ({formatDecimalTime(todayTotalTime / 60)}時間)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 8時間労働完了の通知 */}
      {hasTodayReport && isEightHoursComplete && (
        <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <span className="text-sm font-medium text-green-800">
                8時間労働が完了しています
              </span>
              <p className="text-xs text-green-600 mt-1">
                合計作業時間: {formatTime(todayTotalTime / 60)} ({formatDecimalTime(todayTotalTime / 60)}時間)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 今日の投稿内容表示 */}
      {todayReport && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">
            今日の投稿内容 ({formatDate(todayReport.date)})
          </h4>
          
          <div className="space-y-2">
            {todayReport.workItems
              .sort((a, b) => new Date(`2000-01-01T${a.startTime}`).getTime() - new Date(`2000-01-01T${b.startTime}`).getTime())
              .map((item, index) => {
              const workTime = calculateWorkTime(item.startTime, item.endTime, item.workStatus);
              return (
                <div key={item.uniqueId || item.id} className="p-3 bg-white rounded border border-yellow-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">作業 {index + 1}:</span>
                      <span className="ml-2 text-gray-600">{item.name}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">客先名:</span>
                      <span className="ml-2 text-gray-600">{item.customerName}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">工番:</span>
                      <span className="ml-2 text-gray-600">
                        {item.workNumberFront} - {item.workNumberBack}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">作業時間:</span>
                      <span className="ml-2 text-gray-600">
                        {item.startTime} - {item.endTime}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">機械種類:</span>
                      <span className="ml-2 text-gray-600">{item.machineType}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">作業合計時間:</span>
                      <span className="ml-2 text-gray-600">
                        {formatTime(workTime)} ({formatDecimalTime(workTime)}時間)
                      </span>
                    </div>
                    {item.remarks && (
                      <div className="md:col-span-2">
                        <span className="font-medium text-gray-700">備考:</span>
                        <span className="ml-2 text-gray-600">{item.remarks}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 今日の最終作業終了時間 */}
      {todayReport && todayReport.workItems.length > 0 && (
        <div className="mb-4 p-3 bg-gray-100 border border-gray-200 rounded-md">
          <div className="text-sm text-gray-800">
            <span className="font-medium">今日の最終作業終了時間:</span>
            <span className="ml-2">
              {todayReport.workItems
                .sort((a, b) => new Date(`2000-01-01T${b.endTime}`).getTime() - new Date(`2000-01-01T${a.endTime}`).getTime())[0].endTime}
            </span>
          </div>
        </div>
      )}

      {/* 前回の投稿詳細（今日の投稿がない場合のみ表示） */}
      {latestReport && latestReport.date !== currentDate && !hasTodayReport && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-blue-700">
            前回の投稿詳細 ({formatDate(latestReport.date)})
          </h4>
          
          <div className="space-y-2">
            {latestReport.workItems
              .sort((a, b) => new Date(`2000-01-01T${a.startTime}`).getTime() - new Date(`2000-01-01T${b.startTime}`).getTime())
              .map((item, index) => {
              const workTime = calculateWorkTime(item.startTime, item.endTime, item.workStatus);
              return (
                <div key={item.id} className="p-3 bg-white border border-blue-200 rounded-md">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">作業 {index + 1}:</span>
                      <span className="ml-2 text-gray-600">{item.name}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">客先名:</span>
                      <span className="ml-2 text-gray-600">{item.customerName}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">工番:</span>
                      <span className="ml-2 text-gray-600">
                        {item.workNumberFront} - {item.workNumberBack}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">作業時間:</span>
                      <span className="ml-2 text-gray-600">
                        {item.startTime} - {item.endTime}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">機械種類:</span>
                      <span className="ml-2 text-gray-600">{item.machineType}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">作業合計時間:</span>
                      <span className="ml-2 text-gray-600">
                        {formatTime(workTime)} ({formatDecimalTime(workTime)}時間)
                      </span>
                    </div>
                    {item.remarks && (
                      <div className="md:col-span-2">
                        <span className="font-medium text-gray-700">備考:</span>
                        <span className="ml-2 text-gray-600">{item.remarks}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-3 p-2 bg-blue-100 rounded-md">
            <div className="text-sm text-blue-800">
              <span className="font-medium">前回の最終作業終了時間:</span>
              <span className="ml-2">
                {latestReport.workItems.length > 0 
                  ? latestReport.workItems
                      .sort((a, b) => new Date(`2000-01-01T${b.endTime}`).getTime() - new Date(`2000-01-01T${a.endTime}`).getTime())[0].endTime
                  : 'なし'}
              </span>
            </div>
          </div>
        </div>
      )}

      {!latestReport && !hasTodayReport && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-sm text-gray-600">
            投稿履歴はありません
          </p>
        </div>
      )}
        </>
      )}
    </div>
  );
} 