import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { 
  ActivitySummary, 
  EditedRates, 
  ExpenseItem, 
  WorkOrderDetail,
  ExpenseCategory,
  RateChange 
} from '@/types/aggregation';
import {
  createEmptyExpense,
  normalizeExpense,
  sanitizeExpensesForSave,
  areExpensesChanged,
  parseInteger,
  AUTO_MARKUP_CATEGORIES,
  determineManualOverride,
  type EditableExpense,
} from '@/lib/aggregation/expense-utils';
import {
  calculateActivityBillAmounts,
  calculateBillLaborSubtotal,
  calculateAdjustmentTotal,
  calculateRateChanges,
  applyEditedMemos,
  createInitialEditedRates,
  createAdjustmentsForAPI,
  type ActivityBillAmountMap,
} from '@/lib/aggregation/rate-utils';
import { getLaborCategory, type ActivityType } from '@/lib/aggregation/activity-utils';

interface AggregationState {
  // ========================================
  // データ（Propsから移動）
  // ========================================
  workOrder: WorkOrderDetail | null;
  isEditing: boolean;

  // 経費編集
  originalExpenses: ExpenseItem[];
  editedExpenses: EditableExpense[];
  expenseRateMap: Record<string, number>; // カテゴリ名 → マークアップ率（例：{ "テスト": 2.0, "その他": 1.5 }）

  // 単価編集
  originalActivities: ActivitySummary[];
  editedRates: EditedRates;

  // 見積もり金額・最終決定金額・納品日編集
  editedEstimateAmount: string;
  editedFinalDecisionAmount: string;
  editedDeliveryDate: string;

  // ========================================
  // 計算値（getter的に使用）
  // ========================================
  
  // 経費の計算値
  getCostExpenseSubtotal: () => number;
  getBillExpenseSubtotal: () => number;
  getExpensesHasChanges: () => boolean;
  getSanitizedExpenses: () => ExpenseItem[];

  // 単価の計算値
  getActivitiesForDisplay: () => ActivitySummary[];
  getActivityBillAmounts: () => ActivityBillAmountMap;
  getBillLaborSubtotal: () => number;
  getAdjustmentTotal: () => number;
  getRateChanges: () => RateChange[];
  getRatesHasChanges: () => boolean;

  // 見積もり金額・最終決定金額・納品日の変更チェック
  getAmountAndDateHasChanges: () => boolean;

  // 労務費原価
  getCostLaborSubtotal: () => number;
  
  // カテゴリ別小計（原価）
  getCostLaborCategorySubtotal: () => number;
  getCostMachineCategorySubtotal: () => number;
  
  // カテゴリ別小計（請求）
  getBillLaborCategorySubtotal: () => number;
  getBillMachineCategorySubtotal: () => number;

  // 総合計
  getCostGrandTotal: () => number;
  getBillGrandTotal: () => number;

  // ========================================
  // アクション
  // ========================================

  // データ初期化
  setWorkOrder: (workOrder: WorkOrderDetail | null) => void;
  setExpenseRateMap: (rateMap: Record<string, number>) => void;
  
  // 編集モード
  startEditing: () => void;
  cancelEditing: () => void;

  // 経費操作
  addExpense: () => void;
  removeExpense: (index: number) => void;
  changeCategoryAt: (index: number, category: ExpenseCategory) => void;
  changeCostFieldAt: (index: number, field: 'costUnitPrice' | 'costQuantity' | 'memo', value: string | number) => void;
  changeBillingFieldAt: (index: number, field: 'billUnitPrice' | 'billQuantity' | 'billTotal' | 'memo', value: string | number) => void;
  resetBillingAt: (index: number) => void;
  changeFileEstimateAt: (index: number, value: string | number) => void;

  // 単価操作
  editRate: (activity: string, field: 'billRate' | 'memo', value: string) => void;
  
  // 見積もり金額・最終決定金額・納品日操作
  setEstimateAmount: (value: string) => void;
  setFinalDecisionAmount: (value: string) => void;
  setDeliveryDate: (value: string) => void;
  
  // API送信用データ取得
  getAdjustmentsForAPI: () => Record<string, { billRate: number; memo: string }>;
}

const isDev = process.env.NODE_ENV === 'development';

export const useAggregationStore = create<AggregationState>()(
  isDev 
    ? devtools((set, get) => createAggregationStore(set, get))
    : (set, get) => createAggregationStore(set, get)
);

function createAggregationStore(
  set: (fn: (state: AggregationState) => Partial<AggregationState>) => void,
  get: () => AggregationState
): AggregationState {
  return {
    // ========================================
    // 初期状態
    // ========================================
    workOrder: null,
    isEditing: false,
    originalExpenses: [],
    editedExpenses: [],
    expenseRateMap: {},
    originalActivities: [],
    editedRates: {},
    editedEstimateAmount: '',
    editedFinalDecisionAmount: '',
    editedDeliveryDate: '',

    // ========================================
    // 計算値（getter）
    // ========================================
    
    // 経費の計算値
    getCostExpenseSubtotal: () => {
      const { editedExpenses, originalExpenses, isEditing } = get();
      const expenses = isEditing ? editedExpenses : originalExpenses;
      return expenses.reduce((sum, expense) => sum + expense.costTotal, 0);
    },

    getBillExpenseSubtotal: () => {
      const { editedExpenses, originalExpenses, isEditing } = get();
      const expenses = isEditing ? editedExpenses : originalExpenses;
      return expenses.reduce((sum, expense) => sum + expense.billTotal, 0);
    },

    getExpensesHasChanges: () => {
      const { editedExpenses, originalExpenses, expenseRateMap } = get();
      return areExpensesChanged(editedExpenses, originalExpenses, expenseRateMap);
    },

    getSanitizedExpenses: () => {
      const { editedExpenses, expenseRateMap } = get();
      return sanitizeExpensesForSave(editedExpenses, expenseRateMap);
    },

    // 単価の計算値
    getActivitiesForDisplay: () => {
      const { originalActivities, editedRates, isEditing } = get();
      return isEditing ? applyEditedMemos(originalActivities, editedRates) : originalActivities;
    },

    getActivityBillAmounts: () => {
      const { originalActivities, editedRates } = get();
      return calculateActivityBillAmounts(originalActivities, editedRates);
    },

    getBillLaborSubtotal: () => {
      const activityBillAmounts = get().getActivityBillAmounts();
      return calculateBillLaborSubtotal(activityBillAmounts);
    },

    getAdjustmentTotal: () => {
      const { originalActivities, editedRates } = get();
      return calculateAdjustmentTotal(originalActivities, editedRates);
    },

    getRateChanges: () => {
      const { originalActivities, editedRates } = get();
      return calculateRateChanges(originalActivities, editedRates);
    },

    getRatesHasChanges: () => {
      const rateChanges = get().getRateChanges();
      return rateChanges.length > 0;
    },

    // 見積もり金額・最終決定金額・納品日の変更チェック
    getAmountAndDateHasChanges: () => {
      const { workOrder, editedEstimateAmount, editedFinalDecisionAmount, editedDeliveryDate } = get();
      if (!workOrder) return false;

      // 見積もり金額の変更チェック
      const originalEstimateStr = workOrder.estimateAmount?.toString() ?? '';
      const estimateChanged = editedEstimateAmount !== originalEstimateStr;

      // 最終決定金額の変更チェック
      const originalFinalStr = workOrder.finalDecisionAmount?.toString() ?? '';
      const finalChanged = editedFinalDecisionAmount !== originalFinalStr;

      // 納品日の変更チェック
      const originalDeliveryDateStr = workOrder.deliveryDate 
        ? new Date(workOrder.deliveryDate).toISOString().split('T')[0]
        : '';
      const deliveryDateChanged = editedDeliveryDate !== originalDeliveryDateStr;

      return estimateChanged || finalChanged || deliveryDateChanged;
    },

    // 労務費原価
    getCostLaborSubtotal: () => {
      const { workOrder } = get();
      if (!workOrder) return 0;
      return workOrder.activities.reduce((sum, activity) => sum + activity.costAmount, 0);
    },

    // カテゴリ別小計（原価）
    getCostLaborCategorySubtotal: () => {
      const { workOrder } = get();
      if (!workOrder) return 0;
      return workOrder.activities
        .filter((activity) => getLaborCategory(activity.activity as ActivityType) === 'LABOR')
        .reduce((sum, activity) => sum + activity.costAmount, 0);
    },

    getCostMachineCategorySubtotal: () => {
      const { workOrder } = get();
      if (!workOrder) return 0;
      return workOrder.activities
        .filter((activity) => getLaborCategory(activity.activity as ActivityType) === 'MACHINE')
        .reduce((sum, activity) => sum + activity.costAmount, 0);
    },

    // カテゴリ別小計（請求）
    getBillLaborCategorySubtotal: () => {
      const activityBillAmounts = get().getActivityBillAmounts();
      const { workOrder } = get();
      if (!workOrder) return 0;
      return workOrder.activities
        .filter((activity) => getLaborCategory(activity.activity as ActivityType) === 'LABOR')
        .reduce((sum, activity) => {
          const billAmount = activityBillAmounts[activity.activity]?.currentBillAmount ?? 0;
          return sum + billAmount;
        }, 0);
    },

    getBillMachineCategorySubtotal: () => {
      const activityBillAmounts = get().getActivityBillAmounts();
      const { workOrder } = get();
      if (!workOrder) return 0;
      return workOrder.activities
        .filter((activity) => getLaborCategory(activity.activity as ActivityType) === 'MACHINE')
        .reduce((sum, activity) => {
          const billAmount = activityBillAmounts[activity.activity]?.currentBillAmount ?? 0;
          return sum + billAmount;
        }, 0);
    },

    // 総合計
    getCostGrandTotal: () => {
      return get().getCostLaborSubtotal() + get().getCostExpenseSubtotal();
    },

    getBillGrandTotal: () => {
      return get().getBillLaborSubtotal() + get().getBillExpenseSubtotal();
    },

    // ========================================
    // アクション
    // ========================================

    setWorkOrder: (workOrder) => {
      set(() => ({
        workOrder,
        originalExpenses: workOrder?.expenses || [],
        originalActivities: workOrder?.activities || [],
      }));
    },

    setExpenseRateMap: (rateMap) => {
      set(() => ({ expenseRateMap: rateMap }));
    },

    startEditing: () => {
      const { workOrder, expenseRateMap } = get();
      if (!workOrder) return;

      console.log('📝 編集モード開始 - 経費率マップ:', expenseRateMap);
      console.log('📝 元の経費データ:', workOrder.expenses);

      // 経費の編集データを準備
      const expenseDrafts = workOrder.expenses.map(expense =>
        normalizeExpense({
          ...expense,
          manualBillOverride: determineManualOverride(expense),
        }, expenseRateMap)
      );
      
      console.log('📝 正規化後の経費データ:', expenseDrafts);

      // 単価の編集データを準備
      const initialRates = createInitialEditedRates(workOrder.activities);

      // 納品日のフォーマット（YYYY-MM-DD形式）
      const deliveryDateStr = workOrder.deliveryDate 
        ? new Date(workOrder.deliveryDate).toISOString().split('T')[0]
        : '';

      set(() => ({
        isEditing: true,
        editedExpenses: expenseDrafts,
        editedRates: initialRates,
        editedEstimateAmount: workOrder.estimateAmount?.toString() ?? '',
        editedFinalDecisionAmount: workOrder.finalDecisionAmount?.toString() ?? '',
        editedDeliveryDate: deliveryDateStr,
      }));
    },

    cancelEditing: () => {
      set(() => ({
        isEditing: false,
        editedExpenses: [],
        editedRates: {},
        editedEstimateAmount: '',
        editedFinalDecisionAmount: '',
        editedDeliveryDate: '',
      }));
    },

    // ========================================
    // 経費操作
    // ========================================

    addExpense: () => {
      const { expenseRateMap } = get();
      set((state) => ({
        editedExpenses: [...state.editedExpenses, normalizeExpense(createEmptyExpense(), expenseRateMap)],
      }));
    },

    removeExpense: (index) => {
      set((state) => ({
        editedExpenses: state.editedExpenses.filter((_, i) => i !== index),
      }));
    },

    changeCategoryAt: (index, category) => {
      const { expenseRateMap } = get();
      set((state) => {
        const updated = [...state.editedExpenses];
        const target = updated[index];
        if (!target) return {};

        // カテゴリ変更時は、自動マークアップをリセット（falseにして再計算）
        const manualBillOverride = expenseRateMap[category] !== undefined
          ? false  // 経費率が登録されているカテゴリは自動計算
          : true;  // 未登録のカテゴリは手動設定

        updated[index] = normalizeExpense({
          ...target,
          category,
          manualBillOverride,
        }, expenseRateMap);

        return { editedExpenses: updated };
      });
    },

    changeCostFieldAt: (index, field, value) => {
      const { expenseRateMap } = get();
      set((state) => {
        const updated = [...state.editedExpenses];
        const target = updated[index];
        if (!target) return {};

        if (field === 'memo') {
          updated[index] = {
            ...target,
            memo: value as string,
          };
        } else {
          const numericValue = parseInteger(value, field === 'costQuantity' ? 1 : 0);
          updated[index] = normalizeExpense({
            ...target,
            [field]: field === 'costQuantity' ? Math.max(1, numericValue) : Math.max(0, numericValue),
          }, expenseRateMap);
        }

        return { editedExpenses: updated };
      });
    },

    changeBillingFieldAt: (index, field, value) => {
      const { expenseRateMap } = get();
      set((state) => {
        const updated = [...state.editedExpenses];
        const target = updated[index];
        if (!target) return {};

        if (field === 'memo') {
          updated[index] = {
            ...target,
            memo: value as string,
          };
          return { editedExpenses: updated };
        }

        const numericValue = parseInteger(value, field === 'billQuantity' ? 1 : 0);

        if (field === 'billQuantity') {
          const billQuantity = Math.max(1, numericValue);
          const billTotal = (target.billUnitPrice ?? 0) * billQuantity;
          updated[index] = normalizeExpense({
            ...target,
            billQuantity,
            billTotal,
            manualBillOverride: true,
          }, expenseRateMap);
        } else if (field === 'billUnitPrice') {
          const billUnitPrice = Math.max(0, numericValue);
          const billTotal = billUnitPrice * (target.billQuantity > 0 ? target.billQuantity : 1);
          updated[index] = normalizeExpense({
            ...target,
            billUnitPrice,
            billTotal,
            manualBillOverride: true,
          }, expenseRateMap);
        } else {
          // billTotal
          const billTotal = Math.max(0, numericValue);
          const quantity = target.billQuantity > 0 ? target.billQuantity : 1;
          const billUnitPrice = quantity > 0 ? Math.ceil(billTotal / quantity) : billTotal;
          updated[index] = normalizeExpense({
            ...target,
            billUnitPrice,
            billTotal,
            manualBillOverride: true,
          }, expenseRateMap);
        }

        return { editedExpenses: updated };
      });
    },

    resetBillingAt: (index) => {
      const { expenseRateMap } = get();
      set((state) => {
        const updated = [...state.editedExpenses];
        const target = updated[index];
        if (!target) return {};

        updated[index] = normalizeExpense({
          ...target,
          manualBillOverride: false,
        }, expenseRateMap);

        return { editedExpenses: updated };
      });
    },

    changeFileEstimateAt: (index, value) => {
      set((state) => {
        const updated = [...state.editedExpenses];
        const target = updated[index];
        if (!target) return {};

        const parsedValue = parseInteger(value, 0);

        updated[index] = {
          ...target,
          fileEstimate: value === '' ? null : parsedValue,
        };

        return { editedExpenses: updated };
      });
    },

    // ========================================
    // 単価操作
    // ========================================

    editRate: (activity, field, value) => {
      set((state) => ({
        editedRates: {
          ...state.editedRates,
          [activity]: {
            ...state.editedRates[activity],
            [field]: value,
          },
        },
      }));
    },

    // ========================================
    // 見積もり金額・最終決定金額・納品日操作
    // ========================================

    setEstimateAmount: (value) => {
      set(() => ({
        editedEstimateAmount: value,
      }));
    },

    setFinalDecisionAmount: (value) => {
      set(() => ({
        editedFinalDecisionAmount: value,
      }));
    },

    setDeliveryDate: (value) => {
      set(() => ({
        editedDeliveryDate: value,
      }));
    },

    // ========================================
    // API送信用
    // ========================================

    getAdjustmentsForAPI: () => {
      const { editedRates, originalActivities } = get();
      return createAdjustmentsForAPI(editedRates, originalActivities);
    },
  };
}

