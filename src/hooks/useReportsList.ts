'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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

// 詳細検索条件の型（month以外）
export type DetailFilters = Omit<Filters, 'month'>;

const createDefaultPagination = (): PaginationInfo => ({
  page: 1,
  limit: 50,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
});

const createEmptyDetailFilters = (): DetailFilters => ({
  workerName: '',
  customerName: '',
  workNumberFront: '',
  workNumberBack: '',
  machineType: '',
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

  // 選択中の年月（即時反映）
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);

  // 適用中の詳細検索条件（検索ボタン押下で反映）
  const [appliedDetailFilters, setAppliedDetailFilters] = useState<DetailFilters>(createEmptyDetailFilters);

  // 統合されたフィルター状態（UI表示用・互換性維持）
  const filters: Filters = useMemo(() => ({
    month: selectedMonth,
    ...appliedDetailFilters,
  }), [selectedMonth, appliedDetailFilters]);

  // 初回読み込みフラグ
  const isInitialLoad = useRef(true);

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
        // APIレスポンスは { success, data: { ... } } 形式
        const data = result.data || result;
        const newFilterOptions: FilterOptions = {
          availableMonths: data.availableMonths || [],
          uniqueWorkers: data.uniqueWorkers || [],
          uniqueCustomerNames: data.uniqueCustomerNames || [],
          uniqueWorkNumbers: data.uniqueWorkNumbers || [],
          uniqueMachineTypes: data.uniqueMachineTypes || [],
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
        setSelectedMonth(currentYearMonth);
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

  // 年月変更時・初回ロード時にデータを取得
  useEffect(() => {
    if (filterOptions.availableMonths.length > 0 && selectedMonth) {
      // 初回ロード時または年月変更時にAPI呼び出し
      fetchReports({ month: selectedMonth, ...appliedDetailFilters }, 1);
      isInitialLoad.current = false;
    }
  }, [fetchReports, selectedMonth, filterOptions.availableMonths.length, appliedDetailFilters]);

  // 年月を変更（即時反映）
  const updateMonth = useCallback((month: string) => {
    setSelectedMonth(month);
  }, []);

  // 詳細検索を実行（検索ボタン押下時）
  const executeDetailSearch = useCallback((detailFilters: DetailFilters) => {
    setAppliedDetailFilters(detailFilters);
  }, []);

  // 詳細検索条件をクリア
  const clearDetailFilters = useCallback(() => {
    setAppliedDetailFilters(createEmptyDetailFilters());
  }, []);

  // 全フィルタークリア（年月は当月に、詳細条件はリセット）
  const clearFilters = useCallback(() => {
    setSelectedMonth(currentYearMonth);
    setAppliedDetailFilters(createEmptyDetailFilters());
  }, [currentYearMonth]);

  // 詳細検索条件が設定されているか
  const hasDetailFilters = useMemo(() => {
    return Object.values(appliedDetailFilters).some(v => v !== '');
  }, [appliedDetailFilters]);

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
    selectedMonth,
    appliedDetailFilters,
    updateMonth,
    executeDetailSearch,
    clearDetailFilters,
    clearFilters,
    hasDetailFilters,
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

