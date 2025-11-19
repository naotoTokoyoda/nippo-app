'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import { useToast } from '@/components/ToastProvider';
import { PeriodType } from '@/types/aggregation';

// 集計完了案件の型定義
interface AggregatedWorkOrder {
  id: string;
  workNumber: string;
  customerName: string;
  projectName: string;
  totalHours: number;
  completedAt: string;
  term: string | null;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

// LocalStorageのキー
const STORAGE_KEY = 'aggregation_history_search';

// 検索条件の型
interface SearchConditions {
  searchQuery: string;
  customerName: string;
  periodType: PeriodType;
  startDate: string;
  endDate: string;
  sortBy: 'workNumber' | 'completedAt' | 'totalHours';
  sortOrder: 'asc' | 'desc';
}

// デフォルトの検索条件
const getDefaultConditions = (): SearchConditions => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const fiscalYear = currentMonth >= 3 ? currentYear : currentYear - 1;
  
  return {
    searchQuery: '',
    customerName: '',
    periodType: 'year', // デフォルトは今年度
    startDate: `${fiscalYear}-04`, // 今年度の4月
    endDate: `${fiscalYear + 1}-03`, // 今年度の3月
    sortBy: 'completedAt',
    sortOrder: 'desc',
  };
};

export default function AggregationHistory() {
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
      // URLパラメータから検索条件を取得
      const page = parseInt(searchParams.get('page') || '1', 10);
      const urlSearch = searchParams.get('search') || '';
      const urlCustomer = searchParams.get('customerName') || '';
      const urlPeriod = (searchParams.get('periodType') as PeriodType) || '';
      const urlStart = searchParams.get('startDate') || '';
      const urlEnd = searchParams.get('endDate') || '';
      const urlSort = (searchParams.get('sortBy') as 'workNumber' | 'completedAt' | 'totalHours') || '';
      const urlOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || '';

      // URLにパラメータがある場合はそれを優先、なければLocalStorageから読み込み
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
        // LocalStorageから前回の検索条件を復元
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

  // 検索実行
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    // 検索条件を保存
    saveSearchConditions({ searchQuery, customerName, periodType, startDate, endDate, sortBy, sortOrder });
    
    const params = new URLSearchParams();
    params.set('page', '1');
    
    if (searchQuery) {
      params.set('search', searchQuery);
    }
    
    if (customerName) {
      params.set('customerName', customerName);
    }
    
    if (periodType) {
      params.set('periodType', periodType);
      if (periodType === 'custom' && startDate && endDate) {
        params.set('startDate', startDate);
        params.set('endDate', endDate);
      }
    }
    
    if (sortBy) {
      params.set('sortBy', sortBy);
    }
    
    if (sortOrder) {
      params.set('sortOrder', sortOrder);
    }
    
    router.push(`/aggregation/history?${params.toString()}`);
  }, [searchQuery, customerName, periodType, startDate, endDate, sortBy, sortOrder, router, saveSearchConditions]);

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
    
    // 検索条件を保存
    saveSearchConditions({ searchQuery, customerName, periodType, startDate, endDate, sortBy: column, sortOrder: newSortOrder });
    
    const params = new URLSearchParams();
    params.set('page', '1');
    
    if (searchQuery) {
      params.set('search', searchQuery);
    }
    
    if (customerName) {
      params.set('customerName', customerName);
    }
    
    if (periodType) {
      params.set('periodType', periodType);
      if (periodType === 'custom' && startDate && endDate) {
        params.set('startDate', startDate);
        params.set('endDate', endDate);
      }
    }
    
    params.set('sortBy', column);
    params.set('sortOrder', newSortOrder);
    
    router.push(`/aggregation/history?${params.toString()}`);
  }, [searchQuery, customerName, periodType, startDate, endDate, sortBy, sortOrder, router, saveSearchConditions]);

  // 期間タイプ変更時の処理
  const handlePeriodTypeChange = useCallback((type: PeriodType) => {
    setPeriodType(type);
    
    // 今月・今年度の場合は日付を自動設定
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
    const params = new URLSearchParams();
    params.set('page', newPage.toString());
    
    if (searchQuery) {
      params.set('search', searchQuery);
    }
    
    if (customerName) {
      params.set('customerName', customerName);
    }
    
    if (periodType) {
      params.set('periodType', periodType);
      if (periodType === 'custom' && startDate && endDate) {
        params.set('startDate', startDate);
        params.set('endDate', endDate);
      }
    }
    
    if (sortBy) {
      params.set('sortBy', sortBy);
    }
    
    if (sortOrder) {
      params.set('sortOrder', sortOrder);
    }
    
    router.push(`/aggregation/history?${params.toString()}`);
  }, [searchQuery, customerName, periodType, startDate, endDate, sortBy, sortOrder, router]);

  // 時間フォーマット
  const formatHours = (hours: number) => {
    return `${hours.toFixed(2)}時間`;
  };

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // 認証チェック中または未認証の場合
  if (!isAuthenticated || loading) {
    return (
      <PageLayout title="案件履歴">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">読み込み中...</span>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="案件履歴">
      <div className="space-y-6">
        {/* 戻るリンク */}
        <div>
          <Link
            href="/aggregation"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            集計メニューに戻る
          </Link>
        </div>

        {/* 検索フォーム */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">🔍 案件検索</h3>
          <form onSubmit={handleSearch} className="space-y-4">
            {/* 工番検索 */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                工番
              </label>
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="例: 1234 または 1234-A"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 顧客名検索 */}
            <div>
              <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-2">
                顧客名
              </label>
              <input
                type="text"
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="例: 神戸製鋼所"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 期間選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                期間
              </label>
              <div className="flex flex-wrap gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => handlePeriodTypeChange('month')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    periodType === 'month'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  今月
                </button>
                <button
                  type="button"
                  onClick={() => handlePeriodTypeChange('year')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    periodType === 'year'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  今年度
                </button>
                <button
                  type="button"
                  onClick={() => handlePeriodTypeChange('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    periodType === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  全期間
                </button>
                <button
                  type="button"
                  onClick={() => handlePeriodTypeChange('custom')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    periodType === 'custom'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  範囲指定
                </button>
              </div>

              {/* カスタム範囲指定 */}
              {periodType === 'custom' && (
                <div className="flex items-center gap-3 mt-3">
                  <input
                    type="month"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <span className="text-gray-600">〜</span>
                  <input
                    type="month"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              )}
            </div>

            {/* 検索ボタン */}
            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                検索
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                クリア
              </button>
            </div>
          </form>
        </div>

        {/* ヘッダー */}
        <div className="text-sm text-gray-600">
          {pagination.totalItems}件の完了案件
          {(searchQuery || customerName || periodType === 'month' || periodType === 'all') && (
            <span className="ml-2 text-gray-500">
              （
              {searchQuery && <span>工番: <span className="font-medium">{searchQuery}</span></span>}
              {searchQuery && (customerName || periodType === 'month' || periodType === 'all') && <span className="mx-1">|</span>}
              {customerName && <span>顧客: <span className="font-medium">{customerName}</span></span>}
              {customerName && (periodType === 'month' || periodType === 'all') && <span className="mx-1">|</span>}
              {periodType === 'month' && <span>期間: <span className="font-medium">今月</span></span>}
              {periodType === 'all' && <span>期間: <span className="font-medium">全期間</span></span>}
              ）
            </span>
          )}
        </div>

        {/* テーブル */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('workNumber')}
                      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                    >
                      工番
                      {sortBy === 'workNumber' && (
                        <span className="text-blue-600">
                          {sortOrder === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    顧客
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    案件名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('totalHours')}
                      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                    >
                      累計時間
                      {sortBy === 'totalHours' && (
                        <span className="text-blue-600">
                          {sortOrder === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('completedAt')}
                      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                    >
                      完了日
                      {sortBy === 'completedAt' && (
                        <span className="text-blue-600">
                          {sortOrder === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.workNumber}
                      {item.term && (
                        <div className="text-xs text-gray-500">{item.term}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.customerName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.projectName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatHours(item.totalHours)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(item.completedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link href={`/aggregation/detail/${item.id}`}>
                        <button className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer">
                          詳細
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {items.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500">
                {searchQuery 
                  ? '検索条件に一致する完了案件がありません' 
                  : '完了案件がありません'}
              </div>
            </div>
          )}
        </div>

        {/* ページネーション */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between bg-white px-4 py-3 border border-gray-200 rounded-lg">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                前へ
              </button>
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                次へ
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  全<span className="font-medium">{pagination.totalItems}</span>件中{' '}
                  <span className="font-medium">
                    {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}
                  </span>
                  〜
                  <span className="font-medium">
                    {Math.min(
                      pagination.currentPage * pagination.itemsPerPage,
                      pagination.totalItems
                    )}
                  </span>
                  件を表示
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">前へ</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    {pagination.currentPage} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">次へ</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

