import { ActivitySummary, EditedRates } from '@/types/aggregation';

interface AggregationAdjustmentMemoProps {
  activities: ActivitySummary[];
  editedRates: EditedRates;
  onRateEdit: (activity: string, field: 'billRate' | 'memo', value: string) => void;
}

export default function AggregationAdjustmentMemo({
  activities,
  editedRates,
  onRateEdit,
}: AggregationAdjustmentMemoProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">社内メモ</h3>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.activity} className="flex items-center space-x-4">
            <div className="w-24 text-sm font-medium text-gray-700">{activity.activityName}</div>
            <input
              type="text"
              value={editedRates[activity.activity]?.memo || ''}
              onChange={(e) => onRateEdit(activity.activity, 'memo', e.target.value)}
              placeholder="社内メモを入力..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
