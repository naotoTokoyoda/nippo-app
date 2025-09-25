import { WorkOrderDetail } from '@/types/aggregation';

interface AggregationHeaderProps {
  workOrder: WorkOrderDetail;
  formatHours: (hours: number) => string;
}

export default function AggregationHeader({ workOrder, formatHours }: AggregationHeaderProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-500">工番</label>
          <div className="text-lg font-semibold">{workOrder.workNumber}</div>
          <div className="text-sm text-gray-500">{workOrder.term}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500">顧客</label>
          <div className="text-lg font-semibold">{workOrder.customerName}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500">案件名</label>
          <div className="text-lg font-semibold">{workOrder.projectName}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500">総時間</label>
          <div className="text-lg font-semibold">{formatHours(workOrder.totalHours)}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500">ステータス</label>
          <div className="flex items-center">
            <span
              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                workOrder.status === 'aggregating'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {workOrder.status === 'aggregating' ? '集計中' : '完了'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
