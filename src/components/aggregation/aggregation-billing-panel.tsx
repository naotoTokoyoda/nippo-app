import { ExpenseCategory } from '@/types/aggregation';
import { useAggregationStore } from '@/stores/aggregationStore';

interface AggregationBillingPanelProps {
  categoryOptions: Array<{ value: ExpenseCategory; label: string }>;
  formatCurrency: (amount: number) => string;
  formatHours: (hours: number) => string;
}

export default function AggregationBillingPanel({
  categoryOptions,
  formatCurrency,
  formatHours,
}: AggregationBillingPanelProps) {
  // Zustandストアからデータ・アクションを取得
  const workOrder = useAggregationStore((state) => state.workOrder);
  const isEditing = useAggregationStore((state) => state.isEditing);
  const editedRates = useAggregationStore((state) => state.editedRates);
  const getActivitiesForDisplay = useAggregationStore((state) => state.getActivitiesForDisplay);
  const getActivityBillAmounts = useAggregationStore((state) => state.getActivityBillAmounts);
  const getBillLaborSubtotal = useAggregationStore((state) => state.getBillLaborSubtotal);
  const getBillExpenseSubtotal = useAggregationStore((state) => state.getBillExpenseSubtotal);
  const getBillGrandTotal = useAggregationStore((state) => state.getBillGrandTotal);
  const changeBillingFieldAt = useAggregationStore((state) => state.changeBillingFieldAt);
  const changeFileEstimateAt = useAggregationStore((state) => state.changeFileEstimateAt);
  const editRate = useAggregationStore((state) => state.editRate);

  // 表示用データを取得
  const activities = getActivitiesForDisplay();
  const expenses = isEditing 
    ? useAggregationStore.getState().editedExpenses 
    : (workOrder?.expenses || []);
  const activityBillAmounts = getActivityBillAmounts();
  const billLaborSubtotal = getBillLaborSubtotal();
  const expenseSubtotal = getBillExpenseSubtotal();
  const billTotal = getBillGrandTotal();

  const categoryLabelMap = categoryOptions.reduce<Record<string, string>>((acc, option) => {
    acc[option.value] = option.label;
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-blue-50 px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-blue-900">実際請求</h3>
      </div>
      <div className="border-b border-gray-200 p-4">
        <h4 className="text-sm font-medium text-gray-800 mb-3">労務費詳細</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">区分</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">時間</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">単価</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">小計</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">メモ</th>
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
                        onChange={(event) => editRate(activity.activity, 'billRate', event.target.value)}
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
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedRates[activity.activity]?.memo ?? activity.memo ?? ''}
                        onChange={(event) => editRate(activity.activity, 'memo', event.target.value)}
                        placeholder="メモを入力..."
                        maxLength={50}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      activity.memo || '—'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
      <div className="border-t border-gray-200 p-4 space-y-4">
        <h4 className="text-sm font-medium text-gray-800">経費明細（請求側）</h4>
        {expenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider w-20">カテゴリ</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider w-24">請求単価</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider w-16">数量</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider w-28">請求小計</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider w-32">ファイル見積</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider w-24">メモ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expenses.map((expense, index) => (
                    <tr key={expense.id || index}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                        {categoryLabelMap[expense.category] ?? expense.category}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-left">
                        {isEditing ? (
                          <input
                            type="number"
                            value={expense.billUnitPrice === 0 ? '' : expense.billUnitPrice}
                            onChange={(event) => changeBillingFieldAt(index, 'billUnitPrice', event.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-left"
                            min={0}
                            step={100}
                          />
                        ) : (
                          formatCurrency(expense.billUnitPrice)
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-left">
                        {isEditing ? (
                          <input
                            type="number"
                            value={expense.billQuantity === 0 ? '' : expense.billQuantity}
                            onChange={(event) => changeBillingFieldAt(index, 'billQuantity', event.target.value)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-left"
                            min={1}
                            step={1}
                          />
                        ) : (
                          expense.billQuantity?.toLocaleString() || '0'
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold text-gray-900 text-left">
                        {isEditing ? (
                          <input
                            type="number"
                            value={expense.billTotal === 0 ? '' : expense.billTotal}
                            onChange={(event) => changeBillingFieldAt(index, 'billTotal', event.target.value)}
                            className="w-28 px-2 py-1 border border-gray-300 rounded text-sm text-left"
                            min={0}
                            step={100}
                          />
                        ) : (
                          formatCurrency(expense.billTotal)
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-left">
                        {isEditing ? (
                          <input
                            type="number"
                            value={expense.fileEstimate ?? ''}
                            onChange={(event) => changeFileEstimateAt(index, event.target.value)}
                            className="w-28 px-2 py-1 border border-gray-300 rounded text-sm text-left"
                            min={0}
                            step={100}
                          />
                        ) : (
                          expense.fileEstimate != null ? formatCurrency(expense.fileEstimate) : '—'
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                        {isEditing ? (
                          <input
                            type="text"
                            value={expense.memo ?? ''}
                            onChange={(event) => changeBillingFieldAt(index, 'memo', event.target.value)}
                            placeholder="メモを入力..."
                            maxLength={50}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        ) : (
                          expense.memo || '—'
                        )}
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-700 text-sm border border-dashed border-gray-300 rounded">
            経費の請求データはありません
          </div>
        )}
      </div>
      <div className="border-t border-gray-200 bg-blue-50 p-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-900">労務費小計</span>
            <span className="text-sm font-medium">{formatCurrency(billLaborSubtotal)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-900">経費小計</span>
            <span className="text-sm font-medium">{formatCurrency(expenseSubtotal)}</span>
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
