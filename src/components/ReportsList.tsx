'use client';

import { useState } from 'react';
import { calculateWorkTime, formatTime, formatDecimalTime } from '@/utils/timeCalculation';
import { getRowBackgroundClass } from '@/utils/conditionalFormatting';
import EditWorkItemModal from './EditWorkItemModal';
import ReportsSearchModal from './reports/ReportsSearchModal';
import { WorkItemData } from '@/types/daily-report';
import { DatabaseWorkItem, PaginationInfo } from '@/types/database';
import { useReportsList, FilterOptions, DetailFilters } from '@/hooks/useReportsList';

interface ReportsListProps {
  /** PIN認証済みユーザーID（指定された場合、そのユーザーの日報のみ編集可能） */
  authenticatedUserId?: string;
  /** PIN認証済みユーザー名 */
  authenticatedUserName?: string;
}

export default function ReportsList({
  authenticatedUserId,
  authenticatedUserName,
}: ReportsListProps = {}) {
  const {
    filteredWorkItems,
    loading,
    error,
    totalCount,
    pagination,
    filters,
    filterOptions,
    selectedMonth,
    appliedDetailFilters,
    updateMonth,
    executeDetailSearch,
    clearDetailFilters,
    hasDetailFilters,
    handlePageChange,
    isEditModalOpen,
    selectedWorkItem,
    selectedReportId,
    openEditModal,
    closeEditModal,
    retryFetch,
  } = useReportsList();

  // 詳細検索モーダルの状態
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  if (error) {
    return <ErrorDisplay error={error} onRetry={retryFetch} />;
  }

  return (
    <div>
      {/* フィルター */}
      <ReportsFilter
        selectedMonth={selectedMonth}
        filterOptions={filterOptions}
        appliedDetailFilters={appliedDetailFilters}
        hasDetailFilters={hasDetailFilters}
        onMonthChange={updateMonth}
        onOpenSearchModal={() => setIsSearchModalOpen(true)}
        onClearDetailFilters={clearDetailFilters}
      />

      {/* 結果件数 */}
      <ResultCount totalCount={totalCount} pagination={pagination} />

      {/* 作業項目一覧テーブル */}
      <ReportsTable
        items={filteredWorkItems}
        loading={loading}
        pagination={pagination}
        onEdit={openEditModal}
        authenticatedUserName={authenticatedUserName}
      />

      {/* ページネーション */}
      <Pagination
        pagination={pagination}
        onPageChange={handlePageChange}
      />

      {/* 編集モーダル */}
      <EditWorkItemModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        workItem={selectedWorkItem}
        reportId={selectedReportId}
        availableCustomerNames={filterOptions.uniqueCustomerNames}
      />

      {/* 詳細検索モーダル */}
      <ReportsSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSearch={executeDetailSearch}
        currentFilters={filters}
        filterOptions={filterOptions}
      />
    </div>
  );
}

// =========================================
// サブコンポーネント
// =========================================

function ErrorDisplay({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col justify-center items-center h-64">
      <div className="text-lg text-red-600 mb-4">エラー: {error}</div>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        再試行
      </button>
    </div>
  );
}

interface ReportsFilterProps {
  selectedMonth: string;
  filterOptions: FilterOptions;
  appliedDetailFilters: DetailFilters;
  hasDetailFilters: boolean;
  onMonthChange: (month: string) => void;
  onOpenSearchModal: () => void;
  onClearDetailFilters: () => void;
}

function ReportsFilter({
  selectedMonth,
  filterOptions,
  appliedDetailFilters,
  hasDetailFilters,
  onMonthChange,
  onOpenSearchModal,
  onClearDetailFilters,
}: ReportsFilterProps) {
  // 適用中の詳細条件をタグ形式で表示
  const getAppliedFilterTags = () => {
    const tags: { label: string; value: string }[] = [];
    if (appliedDetailFilters.workerName) tags.push({ label: '作業者', value: appliedDetailFilters.workerName });
    if (appliedDetailFilters.customerName) tags.push({ label: '客先', value: appliedDetailFilters.customerName });
    if (appliedDetailFilters.workNumberFront) tags.push({ label: '工番(前)', value: appliedDetailFilters.workNumberFront });
    if (appliedDetailFilters.workNumberBack) tags.push({ label: '工番(後)', value: appliedDetailFilters.workNumberBack });
    if (appliedDetailFilters.machineType) tags.push({ label: '機械', value: appliedDetailFilters.machineType });
    return tags;
  };

  const filterTags = getAppliedFilterTags();

  return (
    <div className="mb-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* フィルターエリア */}
      <div className="px-4 py-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* 年月セレクト */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">年月</label>
            <select
              value={selectedMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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

          {/* 詳細検索ボタン */}
          <button
            onClick={onOpenSearchModal}
            className={`
              px-4 py-2 rounded-md text-sm flex items-center gap-2 transition-colors
              ${hasDetailFilters 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }
            `}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            詳細検索
            {hasDetailFilters && (
              <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {filterTags.length}
              </span>
            )}
          </button>

          {/* クリアボタン */}
          {hasDetailFilters && (
            <button
              onClick={onClearDetailFilters}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              条件をクリア
            </button>
          )}
        </div>

        {/* 適用中のフィルタータグ */}
        {hasDetailFilters && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500">絞り込み:</span>
              {filterTags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                >
                  <span className="text-gray-500">{tag.label}:</span>
                  <span className="font-medium">{tag.value}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultCount({ totalCount, pagination }: { totalCount: number; pagination: PaginationInfo }) {
  return (
    <div className="mb-4 text-sm text-gray-600">
      {totalCount}件の作業項目が見つかりました
      {pagination.totalPages > 1 && (
        <span className="ml-2">
          （{pagination.page} / {pagination.totalPages}ページ）
        </span>
      )}
    </div>
  );
}

interface ReportsTableProps {
  items: DatabaseWorkItem[];
  loading: boolean;
  pagination: PaginationInfo;
  onEdit: (item: WorkItemData, reportId: string) => void;
  authenticatedUserName?: string;
}

function ReportsTable({ items, loading, pagination, onEdit, authenticatedUserName }: ReportsTableProps) {
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-sm text-gray-600">データを読み込み中...</p>
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-3 py-8 text-center text-gray-500">
                  作業項目が見つかりません
                </td>
              </tr>
            ) : (
              items.map((item, index) => {
                const workTime = calculateWorkTime(item.startTime, item.endTime, item.workStatus);
                const rowClass = getRowBackgroundClass(item.machineType, item.customerName, item.workNumberBack);
                const itemNumber = (pagination.page - 1) * pagination.limit + index + 1;
                
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
                      {/* authenticatedUserNameが指定されている場合は、そのユーザーの日報のみ編集可能 */}
                      {(!authenticatedUserName || item.workerName === authenticatedUserName) ? (
                        <button
                          onClick={() => onEdit(item, item.reportId!)}
                          className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs transition-colors"
                        >
                          編集
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Pagination({ pagination, onPageChange }: { pagination: PaginationInfo; onPageChange: (page: number) => void }) {
  if (pagination.totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-6 flex justify-center items-center space-x-2">
      <button
        onClick={() => onPageChange(pagination.page - 1)}
        disabled={!pagination.hasPrevPage}
        className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
      >
        前へ
      </button>
      
      <span className="px-3 py-2 text-sm text-gray-600">
        {pagination.page} / {pagination.totalPages}
      </span>
      
      <button
        onClick={() => onPageChange(pagination.page + 1)}
        disabled={!pagination.hasNextPage}
        className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
      >
        次へ
      </button>
    </div>
  );
}
