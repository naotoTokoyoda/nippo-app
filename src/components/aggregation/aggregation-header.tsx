'use client';

import { WorkOrderDetail } from '@/types/aggregation';

interface AggregationHeaderProps {
  workOrder: WorkOrderDetail;
  formatHours: (hours: number) => string;
  onStatusChange?: (newStatus: 'aggregating' | 'aggregated' | 'delivered') => Promise<void>;
}

export default function AggregationHeader({ workOrder, formatHours, onStatusChange }: AggregationHeaderProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">工番</label>
          <div className="text-lg font-semibold">{workOrder.workNumber}</div>
          <div className="text-sm text-gray-700">{workOrder.term}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">顧客</label>
          <div className="text-lg font-semibold">{workOrder.customerName}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">案件名</label>
          <div className="text-lg font-semibold">{workOrder.projectName}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">総時間</label>
          <div className="text-lg font-semibold">{formatHours(workOrder.totalHours)}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">ステータス</label>
          <div className="flex items-center">
            <select
              value={workOrder.status}
              onChange={async (e) => {
                const newStatus = e.target.value as 'aggregating' | 'aggregated' | 'delivered';
                if (onStatusChange && newStatus !== workOrder.status) {
                  await onStatusChange(newStatus);
                }
              }}
              className="block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="delivered">納品済み</option>
              <option value="aggregating">集計中</option>
              <option value="aggregated">完了</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
