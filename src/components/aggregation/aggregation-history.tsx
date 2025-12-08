'use client';

import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import { useAggregationHistory } from '@/hooks/useAggregationHistory';
import {
  AggregationHistorySearchForm,
  AggregationHistoryTable,
  AggregationHistoryPagination,
} from '@/components/aggregation/history';
import { PeriodType } from '@/types/aggregation';

export default function AggregationHistory() {
  const {
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
  } = useAggregationHistory();

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
        <AggregationHistorySearchForm
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          customerName={customerName}
          onCustomerNameChange={setCustomerName}
          periodType={periodType}
          onPeriodTypeChange={handlePeriodTypeChange}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          onSearch={handleSearch}
          onClear={handleClear}
        />

        {/* 検索結果ヘッダー */}
        <SearchResultHeader
          totalItems={pagination.totalItems}
          searchQuery={searchQuery}
          customerName={customerName}
          periodType={periodType}
        />

        {/* テーブル */}
        <AggregationHistoryTable
          items={items}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          searchQuery={searchQuery}
        />

        {/* ページネーション */}
        <AggregationHistoryPagination
          pagination={pagination}
          onPageChange={handlePageChange}
        />
      </div>
    </PageLayout>
  );
}

// 検索結果ヘッダーコンポーネント
interface SearchResultHeaderProps {
  totalItems: number;
  searchQuery: string;
  customerName: string;
  periodType: PeriodType;
}

function SearchResultHeader({ totalItems, searchQuery, customerName, periodType }: SearchResultHeaderProps) {
  const hasFilters = searchQuery || customerName || periodType === 'month' || periodType === 'all';
  
  return (
    <div className="text-sm text-gray-600">
      {totalItems}件の完了案件
      {hasFilters && (
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
  );
}
