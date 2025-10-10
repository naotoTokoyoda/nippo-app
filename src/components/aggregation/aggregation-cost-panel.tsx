import { ActivitySummary, ExpenseCategory, ExpenseItem } from '@/types/aggregation';

interface AggregationCostPanelProps {
  activities: ActivitySummary[];
  expenses: ExpenseItem[];
  isEditing: boolean;
  categoryOptions: Array<{ value: ExpenseCategory; label: string }>;
  onExpenseAdd: () => void;
  onExpenseCategoryChange: (index: number, category: ExpenseCategory) => void;
  onExpenseCostChange: (index: number, field: 'costUnitPrice' | 'costQuantity', value: string | number) => void;
  onExpenseRemove: (index: number) => void;
  onFileEstimateChange: (index: number, value: string | number) => void;
  costLaborSubtotal: number;
  expenseSubtotal: number;
  costTotal: number;
  formatCurrency: (amount: number) => string;
  formatHours: (hours: number) => string;
}

export default function AggregationCostPanel({
  activities,
  expenses,
  isEditing,
  categoryOptions,
  onExpenseAdd,
  onExpenseCategoryChange,
  onExpenseCostChange,
  onExpenseRemove,
  onFileEstimateChange,
  costLaborSubtotal,
  expenseSubtotal,
  costTotal,
  formatCurrency,
  formatHours,
}: AggregationCostPanelProps) {
  const categoryLabelMap = categoryOptions.reduce<Record<string, string>>((acc, option) => {
    acc[option.value] = option.label;
    return acc;
  }, {});

  const categorySummaries = expenses.reduce<Record<string, { costTotal: number; fileEstimateTotal: number }>>((acc, expense) => {
    const summary = acc[expense.category] ?? { costTotal: 0, fileEstimateTotal: 0 };
    summary.costTotal += expense.costTotal;
    summary.fileEstimateTotal += expense.fileEstimate ?? 0;
    acc[expense.category] = summary;
    return acc;
  }, {});

  const orderedCategories = [
    ...categoryOptions.map(option => option.value),
    ...Object.keys(categorySummaries).filter(key => !categoryOptions.some(option => option.value === key)),
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">原価合計</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">区分</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">時間</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">単価</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">小計</th>
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
      <div className="border-t border-gray-200 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-800">経費明細（原価側）</h4>
          {isEditing && (
            <button onClick={onExpenseAdd} className="text-blue-600 hover:text-blue-800 text-sm">
              + 行を追加
            </button>
          )}
        </div>
        {expenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider w-20">カテゴリ</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-800 uppercase tracking-wider w-24">原価単価</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-800 uppercase tracking-wider w-16">数量</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-800 uppercase tracking-wider w-28">原価小計</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-800 uppercase tracking-wider w-32">ファイル見積</th>
                  {isEditing && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expenses.map((expense, index) => (
                  <tr key={expense.id || index}>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      {isEditing ? (
                        <select
                          value={expense.category}
                          onChange={(event) => onExpenseCategoryChange(index, event.target.value as ExpenseCategory)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          {categoryOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        categoryOptions.find((option) => option.value === expense.category)?.label ?? expense.category
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          value={expense.costUnitPrice === 0 ? '' : expense.costUnitPrice}
                          onChange={(event) => onExpenseCostChange(index, 'costUnitPrice', event.target.value)}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                          min={0}
                          step={100}
                        />
                      ) : (
                        formatCurrency(expense.costUnitPrice)
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          value={expense.costQuantity === 0 ? '' : expense.costQuantity}
                          onChange={(event) => onExpenseCostChange(index, 'costQuantity', event.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                          min={1}
                          step={1}
                        />
                      ) : (
                        expense.costQuantity?.toLocaleString() || '0'
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                      {formatCurrency(expense.costTotal)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          value={expense.fileEstimate ?? ''}
                          onChange={(event) => onFileEstimateChange(index, event.target.value)}
                          className="w-28 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                          min={0}
                          step={100}
                        />
                      ) : (
                        expense.fileEstimate != null ? formatCurrency(expense.fileEstimate) : '—'
                      )}
                    </td>
                    {isEditing && (
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => onExpenseRemove(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          削除
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-700 text-sm border border-dashed border-gray-300 rounded">
            経費データはありません
          </div>
        )}
      </div>
      <div className="border-t border-gray-200 bg-gray-50 p-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-900">労務費小計</span>
            <span className="text-sm font-medium">{formatCurrency(costLaborSubtotal)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-900">経費小計</span>
            <span className="text-sm font-medium">{formatCurrency(expenseSubtotal)}</span>
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
