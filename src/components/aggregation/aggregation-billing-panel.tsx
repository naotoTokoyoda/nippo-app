import {
  ActivityBillAmountMap,
  ActivitySummary,
  EditedRates,
  Material,
} from '@/types/aggregation';

interface AggregationBillingPanelProps {
  activities: ActivitySummary[];
  materials: Material[];
  editedMaterials: Material[];
  isEditing: boolean;
  editedRates: EditedRates;
  activityBillAmounts: ActivityBillAmountMap;
  billLaborSubtotal: number;
  materialSubtotal: number;
  billTotal: number;
  onRateEdit: (activity: string, field: 'billRate' | 'memo', value: string) => void;
  onMaterialAdd: () => void;
  onMaterialUpdate: (index: number, field: keyof Material, value: string | number) => void;
  onMaterialRemove: (index: number) => void;
  formatCurrency: (amount: number) => string;
  formatHours: (hours: number) => string;
}

export default function AggregationBillingPanel({
  activities,
  materials,
  editedMaterials,
  isEditing,
  editedRates,
  activityBillAmounts,
  billLaborSubtotal,
  materialSubtotal,
  billTotal,
  onRateEdit,
  onMaterialAdd,
  onMaterialUpdate,
  onMaterialRemove,
  formatCurrency,
  formatHours,
}: AggregationBillingPanelProps) {
  const materialsToDisplay = isEditing ? editedMaterials : materials;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-blue-50 px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-blue-900">実際請求</h3>
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
            {activities.map((activity) => {
              const billInfo = activityBillAmounts[activity.activity];
              return (
                <tr key={activity.activity}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {activity.activityName}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatHours(activity.hours)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editedRates[activity.activity]?.billRate ?? activity.billRate.toString()}
                        onChange={(e) => onRateEdit(activity.activity, 'billRate', e.target.value)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-right text-sm"
                        min="0"
                        step="1000"
                      />
                    ) : (
                      formatCurrency(billInfo?.currentBillRate ?? activity.billRate)
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                    {formatCurrency(billInfo?.currentBillAmount ?? activity.hours * activity.billRate)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">材料費</h4>
          {isEditing && (
            <button onClick={onMaterialAdd} className="text-blue-600 hover:text-blue-800 text-sm">
              + 追加
            </button>
          )}
        </div>
        {materialsToDisplay.length > 0 ? (
          <div className="space-y-2">
            {materialsToDisplay.map((material, index) => (
              <div key={material.id} className="py-2 px-3 bg-gray-50 rounded">
                {isEditing ? (
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <input
                        type="text"
                        value={material.name}
                        onChange={(e) => onMaterialUpdate(index, 'name', e.target.value)}
                        placeholder="材料名"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={material.unitPrice === 0 ? '' : material.unitPrice}
                        onChange={(e) => onMaterialUpdate(index, 'unitPrice', e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                        placeholder="単価"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right"
                        min="0"
                        step="1"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={material.quantity === 0 ? '' : material.quantity}
                        onChange={(e) => onMaterialUpdate(index, 'quantity', e.target.value === '' ? 1 : parseInt(e.target.value, 10))}
                        placeholder="数量"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right"
                        min="1"
                        step="1"
                      />
                    </div>
                    <div className="col-span-3 text-right">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(material.totalAmount)}
                      </span>
                    </div>
                    <div className="col-span-1">
                      <button onClick={() => onMaterialRemove(index)} className="text-red-600 hover:text-red-800 text-sm">
                        削除
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
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
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 text-sm">材料費はありません</div>
        )}
      </div>
      <div className="border-t border-gray-200 bg-blue-50 p-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">労務費小計</span>
            <span className="text-sm font-medium">{formatCurrency(billLaborSubtotal)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">材料費小計</span>
            <span className="text-sm font-medium">{formatCurrency(materialSubtotal)}</span>
          </div>
          <div className="border-t border-blue-200 pt-2 flex justify-between items-center">
            <span className="font-semibold text-blue-900">請求合計</span>
            <span className="text-lg font-bold text-blue-900">{formatCurrency(billTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
