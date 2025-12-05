'use client';

import Link from 'next/link';
import { AggregatedWorkOrder, formatHours, formatDate } from '@/hooks/useAggregationHistory';

interface AggregationHistoryTableProps {
  items: AggregatedWorkOrder[];
  sortBy: 'workNumber' | 'completedAt' | 'totalHours';
  sortOrder: 'asc' | 'desc';
  onSort: (column: 'workNumber' | 'completedAt' | 'totalHours') => void;
  searchQuery: string;
}

export function AggregationHistoryTable({
  items,
  sortBy,
  sortOrder,
  onSort,
  searchQuery,
}: AggregationHistoryTableProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortableHeader
                label="工番"
                column="workNumber"
                currentSortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                顧客
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                案件名
              </th>
              <SortableHeader
                label="累計時間"
                column="totalHours"
                currentSortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <SortableHeader
                label="完了日"
                column="completedAt"
                currentSortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
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
  );
}

// ソート可能なヘッダーコンポーネント
interface SortableHeaderProps {
  label: string;
  column: 'workNumber' | 'completedAt' | 'totalHours';
  currentSortBy: 'workNumber' | 'completedAt' | 'totalHours';
  sortOrder: 'asc' | 'desc';
  onSort: (column: 'workNumber' | 'completedAt' | 'totalHours') => void;
}

function SortableHeader({ label, column, currentSortBy, sortOrder, onSort }: SortableHeaderProps) {
  const isActive = currentSortBy === column;
  
  return (
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      <button
        onClick={() => onSort(column)}
        className="flex items-center gap-1 hover:text-gray-700 transition-colors"
      >
        {label}
        {isActive && (
          <span className="text-blue-600">
            {sortOrder === 'asc' ? '▲' : '▼'}
          </span>
        )}
      </button>
    </th>
  );
}

