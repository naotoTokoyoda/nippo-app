'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import { PeriodType } from '@/types/aggregation';

// 集計完了案件の型定義
export interface AggregatedWorkOrder {
  id: string;
  workNumber: string;
  customerName: string;
  projectName: string;
  totalHours: number;
  completedAt: string;
  term: string | null;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

// 検索条件の型
export interface SearchConditions {
  searchQuery: string;
  customerName: string;
  periodType: PeriodType;
  startDate: string;
  endDate: string;
  sortBy: 'workNumber' | 'completedAt' | 'totalHours';
  sortOrder: 'asc' | 'desc';
}

// LocalStorageのキー
const STORAGE_KEY = 'aggregation_history_search';

// デフォルトの検索条件
export const getDefaultConditions = (): SearchConditions => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const fiscalYear = currentMonth >= 3 ? currentYear : currentYear - 1;
  
  return {
    searchQuery: '',
    customerName: '',
    periodType: 'year',
    startDate: `${fiscalYear}-04`,
    endDate: `${fiscalYear + 1}-03`,
    sortBy: 'completedAt',
    sortOrder: 'desc',
  };
};

// ユーティリティ関数
export const formatHours = (hours: number): string => {
  return `${hours.toFixed(2)}時間`;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export function useAggregationHistory() {
  const [items, setItems] = useState<AggregatedWorkOrder[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [periodType, setPeriodType] = useState<PeriodType>('year');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'workNumber' | 'completedAt' | 'totalHours'>('completedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  // 認証状態をチェック
  const checkAuthentication = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/aggregation');
      const data = await response.json();
      
      if (!data.authenticated) {
        router.replace('/');
        return;
      }
      
      setIsAuthenticated(true);
    } catch (error) {
      console.error('認証チェックエラー:', error);
      router.replace('/');
    }
  }, [router]);

  // LocalStorageから検索条件を読み込み
  const loadSearchConditions = useCallback((): SearchConditions => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('検索条件の読み込みエラー:', error);
    }
    return getDefaultConditions();
  }, []);

  // LocalStorageに検索条件を保存
  const saveSearchConditions = useCallback((conditions: SearchConditions) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conditions));
    } catch (error) {
      console.error('検索条件の保存エラー:', error);
    }
  }, []);

  // データを取得
  const fetchHistory = useCallback(async (
    page: number,
    search?: string,
    customer?: string,
    period?: PeriodType,
    start?: string,
    end?: string,
    sort?: 'workNumber' | 'completedAt' | 'totalHours',
    order?: 'asc' | 'desc'
  ) => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });
      
      if (search) {
        params.append('search', search);
      }
      
      if (customer) {
        params.append('customerName', customer);
      }
      
      if (period) {
        params.append('periodType', period);
        if (period === 'custom' && start && end) {
          params.append('startDate', start);
          params.append('endDate', end);
        }
      }
      
      if (sort) {
        params.append('sortBy', sort);
      }
      
      if (order) {
        params.append('sortOrder', order);
      }
      
      const response = await fetch(`/api/aggregation/history?${params}`);
      if (!response.ok) {
        throw new Error('データの取得に失敗しました');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setItems(data.items);
        setPagination(data.pagination);
      } else {
        throw new Error(data.error || 'データの取得に失敗しました');
      }
    } catch (error) {
      console.error('集計完了一覧取得エラー:', error);
      showToast('データの取得に失敗しました。再度お試しください。', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // 初回レンダリング時の認証チェック
  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  // 認証後にデータ取得
  useEffect(() => {
    if (isAuthenticated) {
      const page = parseInt(searchParams.get('page') || '1', 10);
      const urlSearch = searchParams.get('search') || '';
      const urlCustomer = searchParams.get('customerName') || '';
      const urlPeriod = (searchParams.get('periodType') as PeriodType) || '';
      const urlStart = searchParams.get('startDate') || '';
      const urlEnd = searchParams.get('endDate') || '';
      const urlSort = (searchParams.get('sortBy') as 'workNumber' | 'completedAt' | 'totalHours') || '';
      const urlOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || '';

      if (urlSearch || urlCustomer || urlPeriod) {
        setSearchQuery(urlSearch);
        setCustomerName(urlCustomer);
        setPeriodType(urlPeriod || 'year');
        setStartDate(urlStart);
        setEndDate(urlEnd);
        setSortBy(urlSort || 'completedAt');
        setSortOrder(urlOrder || 'desc');
        fetchHistory(page, urlSearch, urlCustomer, urlPeriod || 'year', urlStart, urlEnd, urlSort || 'completedAt', urlOrder || 'desc');
      } else {
        const saved = loadSearchConditions();
        setSearchQuery(saved.searchQuery);
        setCustomerName(saved.customerName);
        setPeriodType(saved.periodType);
        setStartDate(saved.startDate);
        setEndDate(saved.endDate);
        setSortBy(saved.sortBy);
        setSortOrder(saved.sortOrder);
        fetchHistory(page, saved.searchQuery, saved.customerName, saved.periodType, saved.startDate, saved.endDate, saved.sortBy, saved.sortOrder);
      }
    }
  }, [isAuthenticated, searchParams, fetchHistory, loadSearchConditions]);

  // URLパラメータを構築するヘルパー関数
  const buildUrlParams = useCallback((
    options: {
      page?: number;
      search?: string;
      customer?: string;
      period?: PeriodType;
      start?: string;
      end?: string;
      sort?: 'workNumber' | 'completedAt' | 'totalHours';
      order?: 'asc' | 'desc';
    }
  ): URLSearchParams => {
    const params = new URLSearchParams();
    params.set('page', (options.page ?? 1).toString());
    
    const search = options.search ?? searchQuery;
    const customer = options.customer ?? customerName;
    const period = options.period ?? periodType;
    const start = options.start ?? startDate;
    const end = options.end ?? endDate;
    const sort = options.sort ?? sortBy;
    const order = options.order ?? sortOrder;
    
    if (search) {
      params.set('search', search);
    }
    
    if (customer) {
      params.set('customerName', customer);
    }
    
    if (period) {
      params.set('periodType', period);
      if (period === 'custom' && start && end) {
        params.set('startDate', start);
        params.set('endDate', end);
      }
    }
    
    if (sort) {
      params.set('sortBy', sort);
    }
    
    if (order) {
      params.set('sortOrder', order);
    }
    
    return params;
  }, [searchQuery, customerName, periodType, startDate, endDate, sortBy, sortOrder]);

  // 検索実行
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    saveSearchConditions({ searchQuery, customerName, periodType, startDate, endDate, sortBy, sortOrder });
    
    const params = buildUrlParams({ page: 1 });
    router.push(`/aggregation/history?${params.toString()}`);
  }, [searchQuery, customerName, periodType, startDate, endDate, sortBy, sortOrder, router, saveSearchConditions, buildUrlParams]);

  // 検索クリア
  const handleClear = useCallback(() => {
    const defaultConditions = getDefaultConditions();
    setSearchQuery(defaultConditions.searchQuery);
    setCustomerName(defaultConditions.customerName);
    setPeriodType(defaultConditions.periodType);
    setStartDate(defaultConditions.startDate);
    setEndDate(defaultConditions.endDate);
    setSortBy(defaultConditions.sortBy);
    setSortOrder(defaultConditions.sortOrder);
    saveSearchConditions(defaultConditions);
    router.push('/aggregation/history?page=1');
  }, [router, saveSearchConditions]);

  // ソート変更
  const handleSort = useCallback((column: 'workNumber' | 'completedAt' | 'totalHours') => {
    const newSortOrder = sortBy === column && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(column);
    setSortOrder(newSortOrder);
    
    saveSearchConditions({ searchQuery, customerName, periodType, startDate, endDate, sortBy: column, sortOrder: newSortOrder });
    
    const params = buildUrlParams({ page: 1, sort: column, order: newSortOrder });
    router.push(`/aggregation/history?${params.toString()}`);
  }, [searchQuery, customerName, periodType, startDate, endDate, sortBy, sortOrder, router, saveSearchConditions, buildUrlParams]);

  // 期間タイプ変更時の処理
  const handlePeriodTypeChange = useCallback((type: PeriodType) => {
    setPeriodType(type);
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    if (type === 'month') {
      const start = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
      const end = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
      setStartDate(start);
      setEndDate(end);
    } else if (type === 'year') {
      const fiscalYear = currentMonth >= 3 ? currentYear : currentYear - 1;
      setStartDate(`${fiscalYear}-04`);
      setEndDate(`${fiscalYear + 1}-03`);
    }
  }, []);

  // ページ変更
  const handlePageChange = useCallback((newPage: number) => {
    const params = buildUrlParams({ page: newPage });
    router.push(`/aggregation/history?${params.toString()}`);
  }, [router, buildUrlParams]);

  return {
    // 状態
    items,
    pagination,
    loading,
    isAuthenticated,
    // 検索条件
    searchQuery,
    setSearchQuery,
    customerName,
    setCustomerName,
    periodType,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    sortBy,
    sortOrder,
    // ハンドラ
    handleSearch,
    handleClear,
    handleSort,
    handlePeriodTypeChange,
    handlePageChange,
  };
}

