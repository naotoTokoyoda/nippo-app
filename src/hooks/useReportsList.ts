'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { WorkItemData } from '@/types/daily-report';
import { DatabaseWorkItem, ReportsApiResponse, PaginationInfo } from '@/types/database';

export interface FilterOptions {
  availableMonths: string[];
  uniqueWorkers: string[];
  uniqueCustomerNames: string[];
  uniqueWorkNumbers: string[];
  uniqueMachineTypes: string[];
}

export interface Filters {
  month: string;
  workerName: string;
  customerName: string;
  workNumberFront: string;
  workNumberBack: string;
  machineType: string;
}

const createDefaultPagination = (): PaginationInfo => ({
  page: 1,
  limit: 50,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
});

export function useReportsList() {
  // 現在の年月を取得
  const currentYearMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // データ状態
  const [filteredWorkItems, setFilteredWorkItems] = useState<DatabaseWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [pagination, setPagination] = useState<PaginationInfo>(createDefaultPagination);

  // フィルター選択肢
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    availableMonths: [],
    uniqueWorkers: [],
    uniqueCustomerNames: [],
    uniqueWorkNumbers: [],
    uniqueMachineTypes: [],
  });

  // フィルタリング状態
  const [filters, setFilters] = useState<Filters>({
    month: currentYearMonth,
    workerName: '',
    customerName: '',
    workNumberFront: '',
    workNumberBack: '',
    machineType: ''
  });

  // 編集モーダル状態
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedWorkItem, setSelectedWorkItem] = useState<WorkItemData | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string>('');

  // フィルター選択肢を取得
  const fetchFilterOptions = useCallback(async () => {
    try {
      const response = await fetch('/api/reports/filter-options');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      
      if (result.success) {
        const newFilterOptions: FilterOptions = {
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
          const fallbackMonths: string[] = [];
          
          for (let i = -2; i <= 1; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const monthString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            fallbackMonths.push(monthString);
          }
          
          newFilterOptions.availableMonths = fallbackMonths;
          setFilterOptions(newFilterOptions);
        }
        
        // 常に当月をデフォルトに設定
        setFilters(prev => ({ ...prev, month: currentYearMonth }));
      } else {
        throw new Error(result.error || 'フィルター選択肢の取得に失敗しました');
      }
    } catch (err) {
      console.error('フィルター選択肢の取得エラー:', err);
      setError(err instanceof Error ? err.message : 'フィルター選択肢の取得に失敗しました');
    }
  }, [currentYearMonth]);

  // レポートデータを取得
  const fetchReports = useCallback(async (filterParams: Filters, page: number = 1) => {
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
      
      params.append('page', page.toString());
      params.append('limit', pagination.limit.toString());
      
      const response = await fetch(`/api/reports?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result: ReportsApiResponse = await response.json();

      if (result.success) {
        let items: DatabaseWorkItem[] = [];
        
        if (result.filteredItems) {
          items = result.filteredItems;
        } else if (result.data) {
          if (Array.isArray(result.data)) {
            if (result.data.length > 0 && 'reportId' in result.data[0]) {
              items = result.data as DatabaseWorkItem[];
            }
          } else if (typeof result.data === 'object' && 'filteredItems' in result.data) {
            items = result.data.filteredItems || [];
          }
        }
        
        setFilteredWorkItems(items);
        
        const totalCountValue = result.totalCount || 
          (result.data && typeof result.data === 'object' && !Array.isArray(result.data) && 'totalCount' in result.data ? result.data.totalCount : 0) || 
          0;
        setTotalCount(totalCountValue);
        
        const paginationData = result.pagination || 
          (result.data && typeof result.data === 'object' && !Array.isArray(result.data) && 'pagination' in result.data ? result.data.pagination : undefined);
        if (paginationData) {
          setPagination(paginationData);
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
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  // フィルター変更時にデータを再取得
  useEffect(() => {
    if (filterOptions.availableMonths.length > 0 && filters.month) {
      fetchReports(filters, 1);
    }
  }, [fetchReports, filters, filterOptions.availableMonths.length]);

  // フィルター更新
  const updateFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // フィルタークリア
  const clearFilters = useCallback(() => {
    setFilters({
      month: currentYearMonth,
      workerName: '',
      customerName: '',
      workNumberFront: '',
      workNumberBack: '',
      machineType: ''
    });
  }, [currentYearMonth]);

  // ページ変更
  const handlePageChange = useCallback((newPage: number) => {
    fetchReports(filters, newPage);
  }, [fetchReports, filters]);

  // 編集モーダルを開く
  const openEditModal = useCallback((workItem: WorkItemData, reportId: string) => {
    setSelectedWorkItem(workItem);
    setSelectedReportId(reportId);
    setIsEditModalOpen(true);
  }, []);

  // 編集モーダルを閉じる
  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setSelectedWorkItem(null);
    setSelectedReportId('');
  }, []);

  // エラーをクリアして再試行
  const retryFetch = useCallback(() => {
    setError(null);
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  return {
    // データ
    filteredWorkItems,
    loading,
    error,
    totalCount,
    pagination,
    // フィルター
    filters,
    filterOptions,
    updateFilter,
    clearFilters,
    // ページネーション
    handlePageChange,
    // 編集モーダル
    isEditModalOpen,
    selectedWorkItem,
    selectedReportId,
    openEditModal,
    closeEditModal,
    // エラー処理
    retryFetch,
  };
}

