'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { calculateWorkTime, formatTime, formatDecimalTime } from '@/utils/timeCalculation';
import { getRowBackgroundClass } from '@/utils/conditionalFormatting';
import DatabaseClientNameInput from './DatabaseClientNameInput';
import EditWorkItemModal from './EditWorkItemModal';
import { WorkItemData } from '@/types/daily-report';
import { DatabaseWorkItem, ReportsApiResponse, PaginationInfo } from '@/types/database';

export default function ReportsList() {
  
  // データベースから取得したデータ
  const [filteredWorkItems, setFilteredWorkItems] = useState<DatabaseWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  
  // フィルター選択肢の状態
  const [filterOptions, setFilterOptions] = useState({
    availableMonths: [] as string[],
    uniqueWorkers: [] as string[],
    uniqueCustomerNames: [] as string[],
    uniqueWorkNumbers: [] as string[],
    uniqueMachineTypes: [] as string[],
  });
  
  // 編集モーダルの状態
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedWorkItem, setSelectedWorkItem] = useState<WorkItemData | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  
  // 現在の年月を取得
  const currentYearMonth = useMemo(() => {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return yearMonth;
  }, []);

  // フィルタリング状態（デフォルトを当月に設定）
  const [filters, setFilters] = useState({
    month: currentYearMonth,
    workerName: '',
    customerName: '',
    workNumberFront: '',
    workNumberBack: '',
    machineType: ''
  });

  // フィルター選択肢を取得する関数
  const fetchFilterOptions = useCallback(async () => {
    try {
      const response = await fetch('/api/reports/filter-options');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      
      if (result.success) {
        const newFilterOptions = {
          availableMonths: result.availableMonths || [],
          uniqueWorkers: result.uniqueWorkers || [],
          uniqueCustomerNames: result.uniqueCustomerNames || [],
          uniqueWorkNumbers: result.uniqueWorkNumbers || [],
          uniqueMachineTypes: result.uniqueMachineTypes || [],
        };
        
        setFilterOptions(newFilterOptions);
        
        // データがない場合は当月を含む選択肢を生成
        if (newFilterOptions.availableMonths.length === 0) {
          const now = new Date();
          const fallbackMonths = [];
          
          // 過去2ヶ月、当月、翌月まで生成
          for (let i = -2; i <= 1; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const monthString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            fallbackMonths.push(monthString);
          }
          
          newFilterOptions.availableMonths = fallbackMonths;
          setFilterOptions(newFilterOptions);
          
          // デフォルトを当月に設定
          setFilters(prev => ({
            ...prev,
            month: currentYearMonth
          }));
        } else {
          // 日本でのみ使用するため、常に当月をデフォルトに設定
          // 当月のデータがない場合でも、当月を選択して「データなし」を表示
          setFilters(prev => ({
            ...prev,
            month: currentYearMonth
          }));
        }
      } else {
        throw new Error(result.error || 'フィルター選択肢の取得に失敗しました');
      }
    } catch (err) {
      console.error('フィルター選択肢の取得エラー:', err);
      setError(err instanceof Error ? err.message : 'フィルター選択肢の取得に失敗しました');
    }
  }, [currentYearMonth]);

  // データベースからデータを取得する関数（最適化版）
  const fetchReports = useCallback(async (filterParams: typeof filters, page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (filterParams.month) params.append('month', filterParams.month);
      if (filterParams.workerName) params.append('workerName', filterParams.workerName);
      if (filterParams.customerName) params.append('customerName', filterParams.customerName);
      if (filterParams.workNumberFront) params.append('workNumberFront', filterParams.workNumberFront);
      if (filterParams.workNumberBack) params.append('workNumberBack', filterParams.workNumberBack);
      if (filterParams.machineType) params.append('machineType', filterParams.machineType);
      
      // ページネーションパラメータ
      params.append('page', page.toString());
      params.append('limit', pagination.limit.toString());
      
      const response = await fetch(`/api/reports?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result: ReportsApiResponse = await response.json();

      if (result.success) {
        setFilteredWorkItems(result.filteredItems);
        setTotalCount(result.totalCount || 0);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      } else {
        setError(result.error || 'データの取得に失敗しました');
      }
    } catch (err) {
      console.error('データ取得エラー:', err);
      setError(err instanceof Error ? err.message : 'データの取得中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

  // 初期データ取得
  useEffect(() => {
    const initializeData = async () => {
      await fetchFilterOptions();
    };
    initializeData();
  }, [fetchFilterOptions]);

  // フィルター変更時にデータを再取得
  useEffect(() => {
    // フィルター選択肢が設定されていて、フィルターに月が設定されている場合にデータを取得
    if (filterOptions.availableMonths.length > 0 && filters.month) {
      fetchReports(filters, 1);
    }
  }, [fetchReports, filters, filterOptions.availableMonths.length]);

  // ページ変更時の処理
  const handlePageChange = (newPage: number) => {
    fetchReports(filters, newPage);
  };

  const clearFilters = () => {
    // 日本でのみ使用するため、常に当月をデフォルトに設定
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

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <div className="text-lg text-red-600 mb-4">エラー: {error}</div>
        <button
          onClick={() => {
            setError(null);
            fetchFilterOptions();
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          再試行
        </button>
      </div>
    );
  }

  return (
    <div>

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
              {filterOptions.availableMonths.map((month, index) => {
                const [year, monthNum] = month.split('-');
                const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
                return (
                  <option key={`month-${month}-${index}`} value={month}>{monthName}</option>
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
              {filterOptions.uniqueWorkers.map((worker, index) => (
                <option key={`worker-${worker}-${index}`} value={worker}>{worker}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">客先名</label>
            <DatabaseClientNameInput
              value={filters.customerName}
              onChange={(value) => setFilters(prev => ({ ...prev, customerName: value }))}
              availableNames={filterOptions.uniqueCustomerNames}
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
              {filterOptions.uniqueWorkNumbers.map((number, index) => (
                <option key={`workNumberFront-${number}-${index}`} value={number}>{number}</option>
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
              {filterOptions.uniqueMachineTypes.map((type, index) => (
                <option key={`machineType-${type}-${index}`} value={type}>{type}</option>
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
        {totalCount}件の作業項目が見つかりました
        {pagination.totalPages > 1 && (
          <span className="ml-2">
            （{pagination.page} / {pagination.totalPages}ページ）
          </span>
        )}
      </div>

      {/* 作業項目一覧テーブル */}
      <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg shadow-sm relative">
        <div className="min-w-max">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-3 text-left font-medium text-gray-700 sticky top-0 bg-gray-50 whitespace-nowrap">No</th>
                <th className="px-3 py-3 text-left font-medium text-gray-700 sticky top-0 bg-gray-50 whitespace-nowrap">作業日</th>
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
              {loading ? (
                <tr>
                  <td colSpan={13} className="px-3 py-8 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      {/* スピナー */}
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="text-sm text-gray-600">データを読み込み中...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredWorkItems.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-3 py-8 text-center text-gray-500">
                    作業項目が見つかりません
                  </td>
                </tr>
              ) : (
                filteredWorkItems.map((item, index) => {
                  const workTime = calculateWorkTime(item.startTime, item.endTime, item.workStatus);
                  const rowClass = getRowBackgroundClass(item.machineType, item.customerName);
                  const itemNumber = (pagination.page - 1) * pagination.limit + index + 1;
                  
                  // 作業日をフォーマット
                  const formatWorkDate = (dateString: string) => {
                    if (!dateString) return '未入力';
                    const date = new Date(dateString);
                    return date.toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    });
                  };
                  
                  return (
                    <tr key={`${item.reportId}-${item.id}`} className={`${rowClass} border-b border-gray-200 hover:bg-gray-50`}>
                      <td className="px-3 py-3 text-gray-900 whitespace-nowrap font-medium">{itemNumber}</td>
                      <td className="px-3 py-3 text-gray-900 whitespace-nowrap">{formatWorkDate(item.reportDate)}</td>
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

      {/* ページネーション */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center items-center space-x-2">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={!pagination.hasPrevPage}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            前へ
          </button>
          
          <span className="px-3 py-2 text-sm text-gray-600">
            {pagination.page} / {pagination.totalPages}
          </span>
          
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={!pagination.hasNextPage}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            次へ
          </button>
        </div>
      )}

      {/* 編集モーダル */}
      <EditWorkItemModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        workItem={selectedWorkItem}
        reportId={selectedReportId}
        availableCustomerNames={filterOptions.uniqueCustomerNames}
      />
    </div>
  );
} 