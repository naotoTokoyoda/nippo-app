import { ExpenseCategory } from '@/types/aggregation';
import { useAggregationStore } from '@/stores/aggregationStore';
import { getLaborCategory, type ActivityType } from '@/lib/aggregation/activity-utils';

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
  const editedExpenses = useAggregationStore((state) => state.editedExpenses);
  const editedEstimateAmount = useAggregationStore((state) => state.editedEstimateAmount);
  const editedFinalDecisionAmount = useAggregationStore((state) => state.editedFinalDecisionAmount);
  const editedDeliveryDate = useAggregationStore((state) => state.editedDeliveryDate);
  const getActivitiesForDisplay = useAggregationStore((state) => state.getActivitiesForDisplay);
  const getActivityBillAmounts = useAggregationStore((state) => state.getActivityBillAmounts);
  const getBillLaborSubtotal = useAggregationStore((state) => state.getBillLaborSubtotal);
  const getBillLaborCategorySubtotal = useAggregationStore((state) => state.getBillLaborCategorySubtotal);
  const getBillMachineCategorySubtotal = useAggregationStore((state) => state.getBillMachineCategorySubtotal);
  const getBillExpenseSubtotal = useAggregationStore((state) => state.getBillExpenseSubtotal);
  const getBillGrandTotal = useAggregationStore((state) => state.getBillGrandTotal);
  const changeBillingFieldAt = useAggregationStore((state) => state.changeBillingFieldAt);
  const setEstimateAmount = useAggregationStore((state) => state.setEstimateAmount);
  const setFinalDecisionAmount = useAggregationStore((state) => state.setFinalDecisionAmount);
  const setDeliveryDate = useAggregationStore((state) => state.setDeliveryDate);
  const editRate = useAggregationStore((state) => state.editRate);

  // 負の数の入力を防ぐハンドラー
  const preventNegativeInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '-' || e.key === 'e' || e.key === 'E') {
      e.preventDefault();
    }
  };

  // 表示用データを取得
  const activities = getActivitiesForDisplay();
  const expenses = isEditing ? editedExpenses : (workOrder?.expenses || []);
  const activityBillAmounts = getActivityBillAmounts();
  const billLaborSubtotal = getBillLaborSubtotal();
  const laborCategorySubtotal = getBillLaborCategorySubtotal();
  const machineCategorySubtotal = getBillMachineCategorySubtotal();
  const expenseSubtotal = getBillExpenseSubtotal();
  const billTotal = getBillGrandTotal();

  // アクティビティをカテゴリ別に分類
  const laborActivities = activities.filter(
    (activity) => getLaborCategory(activity.activity as ActivityType) === 'LABOR'
  );
  const machineActivities = activities.filter(
    (activity) => getLaborCategory(activity.activity as ActivityType) === 'MACHINE'
  );

  const categoryLabelMap = categoryOptions.reduce<Record<string, string>>((acc, option) => {
    acc[option.value] = option.label;
    return acc;
  }, {});

  // 納品日のフォーマット（表示用）
  const formatDeliveryDate = (date: Date | null | undefined) => {
    if (!date) return '—';
    const d = new Date(date);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-blue-50 px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-blue-900">実際請求</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">納品日:</span>
            {isEditing ? (
              <input
                type="date"
                value={editedDeliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm"
              />
            ) : (
              <span className="text-sm font-medium text-gray-900">
                {formatDeliveryDate(workOrder?.deliveryDate)}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="border-b border-gray-200 p-4">
        <h4 className="text-sm font-medium text-gray-800 mb-3">労務費詳細</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">区分</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 uppercase w-24">時間(H)</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 uppercase w-28">単価</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 uppercase w-32">小計</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase w-40">メモ</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {/* 人工費セクション */}
              <tr className="border-t-2 border-gray-300 bg-blue-50">
                <td className="px-3 py-2">
                  <span className="text-sm font-semibold text-gray-800">人工費</span>
                </td>
                <td className="px-3 py-2 text-sm font-medium text-gray-800 text-right">
                  {formatHours(laborActivities.reduce((sum, a) => sum + a.hours, 0))}
                </td>
                <td className="px-3 py-2"></td>
                <td className="px-3 py-2 text-sm font-bold text-gray-900 text-right">
                  {formatCurrency(laborCategorySubtotal)}
                </td>
                <td className="px-3 py-2"></td>
              </tr>
              {laborActivities.map((activity) => {
                const billInfo = activityBillAmounts[activity.activity];
                return (
                  <tr key={activity.activity} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-700 pl-8">
                      {activity.activityName}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 text-right">
                      {formatHours(activity.hours)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editedRates[activity.activity]?.billRate ?? activity.billRate.toString()}
                          onChange={(event) => editRate(activity.activity, 'billRate', event.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-right text-xs"
                          min="0"
                          step="1000"
                        />
                      ) : (
                        formatCurrency(billInfo?.currentBillRate ?? activity.billRate)
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">
                      {formatCurrency(billInfo?.currentBillAmount ?? activity.hours * activity.billRate)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedRates[activity.activity]?.memo ?? activity.memo ?? ''}
                          onChange={(event) => editRate(activity.activity, 'memo', event.target.value)}
                          placeholder="メモ..."
                          maxLength={50}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                        />
                      ) : (
                        activity.memo || '—'
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* 機械稼働費セクション */}
              <tr className="border-t-2 border-gray-300 bg-blue-50">
                <td className="px-3 py-2">
                  <span className="text-sm font-semibold text-gray-800">機械稼働費</span>
                </td>
                <td className="px-3 py-2 text-sm font-medium text-gray-800 text-right">
                  {formatHours(machineActivities.reduce((sum, a) => sum + a.hours, 0))}
                </td>
                <td className="px-3 py-2"></td>
                <td className="px-3 py-2 text-sm font-bold text-gray-900 text-right">
                  {formatCurrency(machineCategorySubtotal)}
                </td>
                <td className="px-3 py-2"></td>
              </tr>
              {machineActivities.map((activity) => {
                const billInfo = activityBillAmounts[activity.activity];
                return (
                  <tr key={activity.activity} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-700 pl-8">
                      {activity.activityName}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 text-right">
                      {formatHours(activity.hours)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editedRates[activity.activity]?.billRate ?? activity.billRate.toString()}
                          onChange={(event) => editRate(activity.activity, 'billRate', event.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-right text-xs"
                          min="0"
                          step="1000"
                        />
                      ) : (
                        formatCurrency(billInfo?.currentBillRate ?? activity.billRate)
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">
                      {formatCurrency(billInfo?.currentBillAmount ?? activity.hours * activity.billRate)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedRates[activity.activity]?.memo ?? activity.memo ?? ''}
                          onChange={(event) => editRate(activity.activity, 'memo', event.target.value)}
                          placeholder="メモ..."
                          maxLength={50}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
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
            <span className="text-sm font-medium">¥{formatCurrency(billLaborSubtotal)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-900">経費小計</span>
            <span className="text-sm font-medium">¥{formatCurrency(expenseSubtotal)}</span>
          </div>
          <div className="border-t border-blue-200 pt-2 flex justify-between items-center">
            <span className="font-semibold text-blue-900">請求合計</span>
            <span className="text-lg font-bold text-blue-900">¥{formatCurrency(billTotal)}</span>
          </div>
          
          {/* 見積もり金額 */}
          <div className="border-t border-blue-200 pt-2 flex justify-between items-center">
            <span className="font-semibold text-gray-900">見積もり金額</span>
            {isEditing ? (
              <input
                type="number"
                value={editedEstimateAmount}
                onChange={(e) => setEstimateAmount(e.target.value)}
                onKeyDown={preventNegativeInput}
                placeholder="未入力"
                className="w-40 px-3 py-1.5 border border-gray-300 rounded text-right"
                min={0}
                step={1000}
              />
            ) : (
              <span className="text-lg font-bold text-gray-900">
                {workOrder?.estimateAmount != null ? `¥${formatCurrency(workOrder.estimateAmount)}` : '—'}
              </span>
            )}
          </div>

          {/* 最終決定金額 */}
          <div className="bg-red-50 -mx-4 -mb-4 mt-2 p-4 rounded-b-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-red-900">最終決定金額</span>
              {isEditing ? (
                <input
                  type="number"
                  value={editedFinalDecisionAmount}
                  onChange={(e) => setFinalDecisionAmount(e.target.value)}
                  onKeyDown={preventNegativeInput}
                  placeholder="未入力"
                  className="w-40 px-3 py-1.5 border border-red-300 rounded text-right bg-white"
                  min={0}
                  step={1000}
                />
              ) : (
                <span className="text-lg font-bold text-red-900">
                  {workOrder?.finalDecisionAmount != null ? `¥${formatCurrency(workOrder.finalDecisionAmount)}` : '—'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
