import { ActivitySummary, Material } from '@/types/aggregation';

interface AggregationCostPanelProps {
  activities: ActivitySummary[];
  materials: Material[];
  costLaborSubtotal: number;
  materialSubtotal: number;
  costTotal: number;
  formatCurrency: (amount: number) => string;
  formatHours: (hours: number) => string;
}

export default function AggregationCostPanel({
  activities,
  materials,
  costLaborSubtotal,
  materialSubtotal,
  costTotal,
  formatCurrency,
  formatHours,
}: AggregationCostPanelProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">原価合計</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                区分
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                時間
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                単価
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                小計
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {activities.map((activity) => (
              <tr key={activity.activity}>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {activity.activityName}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {formatHours(activity.hours)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {formatCurrency(activity.costRate)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                  {formatCurrency(activity.costAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">材料費</h4>
        </div>
        {materials.length > 0 ? (
          <div className="space-y-2">
            {materials.map((material) => (
              <div key={material.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{material.name}</div>
                  <div className="text-xs text-gray-500">
                    {formatCurrency(material.unitPrice)} × {material.quantity}個
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {formatCurrency(material.totalAmount)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 text-sm">材料費はありません</div>
        )}
      </div>
      <div className="border-t border-gray-200 bg-gray-50 p-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">労務費小計</span>
            <span className="text-sm font-medium">{formatCurrency(costLaborSubtotal)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">材料費小計</span>
            <span className="text-sm font-medium">{formatCurrency(materialSubtotal)}</span>
          </div>
          <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
            <span className="font-semibold text-gray-900">原価合計</span>
            <span className="text-lg font-bold text-gray-900">{formatCurrency(costTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
