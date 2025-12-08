'use client';

import { PeriodType } from '@/types/aggregation';

interface AggregationHistorySearchFormProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  customerName: string;
  onCustomerNameChange: (value: string) => void;
  periodType: PeriodType;
  onPeriodTypeChange: (type: PeriodType) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  onSearch: (e: React.FormEvent) => void;
  onClear: () => void;
}

export function AggregationHistorySearchForm({
  searchQuery,
  onSearchQueryChange,
  customerName,
  onCustomerNameChange,
  periodType,
  onPeriodTypeChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onSearch,
  onClear,
}: AggregationHistorySearchFormProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">🔍 案件検索</h3>
      <form onSubmit={onSearch} className="space-y-4">
        {/* 工番検索 */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
            工番
          </label>
          <input
            type="text"
            id="search"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
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
            onChange={(e) => onCustomerNameChange(e.target.value)}
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
            <PeriodButton
              label="今月"
              type="month"
              currentType={periodType}
              onClick={onPeriodTypeChange}
            />
            <PeriodButton
              label="今年度"
              type="year"
              currentType={periodType}
              onClick={onPeriodTypeChange}
            />
            <PeriodButton
              label="全期間"
              type="all"
              currentType={periodType}
              onClick={onPeriodTypeChange}
            />
            <PeriodButton
              label="範囲指定"
              type="custom"
              currentType={periodType}
              onClick={onPeriodTypeChange}
            />
          </div>

          {/* カスタム範囲指定 */}
          {periodType === 'custom' && (
            <div className="flex items-center gap-3 mt-3">
              <input
                type="month"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <span className="text-gray-600">〜</span>
              <input
                type="month"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
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
            onClick={onClear}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            クリア
          </button>
        </div>
      </form>
    </div>
  );
}

// 期間選択ボタンコンポーネント
interface PeriodButtonProps {
  label: string;
  type: PeriodType;
  currentType: PeriodType;
  onClick: (type: PeriodType) => void;
}

function PeriodButton({ label, type, currentType, onClick }: PeriodButtonProps) {
  const isActive = currentType === type;
  
  return (
    <button
      type="button"
      onClick={() => onClick(type)}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        isActive
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );
}

