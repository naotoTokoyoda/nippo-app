'use client';

import { calculateWorkTime, formatTime, formatDecimalTime } from '@/utils/timeCalculation';
import { getRowBackgroundClass } from '@/utils/conditionalFormatting';
import DatabaseClientNameInput from './DatabaseClientNameInput';
import EditWorkItemModal from './EditWorkItemModal';
import { WorkItemData } from '@/types/daily-report';
import { DatabaseWorkItem, PaginationInfo } from '@/types/database';
import { useReportsList, FilterOptions, Filters } from '@/hooks/useReportsList';

export default function ReportsList() {
  const {
    filteredWorkItems,
    loading,
    error,
    totalCount,
    pagination,
    filters,
    filterOptions,
    updateFilter,
    clearFilters,
    handlePageChange,
    isEditModalOpen,
    selectedWorkItem,
    selectedReportId,
    openEditModal,
    closeEditModal,
    retryFetch,
  } = useReportsList();

  if (error) {
    return <ErrorDisplay error={error} onRetry={retryFetch} />;
  }

  return (
    <div>
      {/* フィルター */}
      <ReportsFilter
        filters={filters}
        filterOptions={filterOptions}
        onFilterChange={updateFilter}
        onClear={clearFilters}
      />

      {/* 結果件数 */}
      <ResultCount totalCount={totalCount} pagination={pagination} />

      {/* 作業項目一覧テーブル */}
      <ReportsTable
        items={filteredWorkItems}
        loading={loading}
        pagination={pagination}
        onEdit={openEditModal}
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
  filters: Filters;
  filterOptions: FilterOptions;
  onFilterChange: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  onClear: () => void;
}

function ReportsFilter({ filters, filterOptions, onFilterChange, onClear }: ReportsFilterProps) {
  return (
    <div className="mb-8 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">フィルター</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 年月 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">年月</label>
          <select
            value={filters.month}
            onChange={(e) => onFilterChange('month', e.target.value)}
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
        
        {/* 作業者名 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">作業者名</label>
          <select
            value={filters.workerName}
            onChange={(e) => onFilterChange('workerName', e.target.value)}
            className="w-full px-3 py-2 h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="">すべて</option>
            {filterOptions.uniqueWorkers.map((worker, index) => (
              <option key={`worker-${worker}-${index}`} value={worker}>{worker}</option>
            ))}
          </select>
        </div>
        
        {/* 客先名 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">客先名</label>
          <DatabaseClientNameInput
            value={filters.customerName}
            onChange={(value) => onFilterChange('customerName', value)}
            availableNames={filterOptions.uniqueCustomerNames}
            placeholder="客先名を入力"
            className="text-gray-900 h-10"
          />
        </div>
        
        {/* 工番（前番） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">工番（前番）</label>
          <select
            value={filters.workNumberFront}
            onChange={(e) => onFilterChange('workNumberFront', e.target.value)}
            className="w-full px-3 py-2 h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="">すべて</option>
            {filterOptions.uniqueWorkNumbers.map((number, index) => (
              <option key={`workNumberFront-${number}-${index}`} value={number}>{number}</option>
            ))}
          </select>
        </div>
        
        {/* 工番（後番） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">工番（後番）</label>
          <input
            type="text"
            value={filters.workNumberBack}
            onChange={(e) => onFilterChange('workNumberBack', e.target.value)}
            placeholder="工番（後番）を入力"
            className="w-full px-3 py-2 h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>
        
        {/* 機械種類 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">機械種類</label>
          <select
            value={filters.machineType}
            onChange={(e) => onFilterChange('machineType', e.target.value)}
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
          onClick={onClear}
          className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
        >
          フィルターをクリア
        </button>
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
}

function ReportsTable({ items, loading, pagination, onEdit }: ReportsTableProps) {
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
                      <button
                        onClick={() => onEdit(item, item.reportId!)}
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
