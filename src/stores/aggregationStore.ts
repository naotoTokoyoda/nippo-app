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

  // 単価編集
  originalActivities: ActivitySummary[];
  editedRates: EditedRates;

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
    originalActivities: [],
    editedRates: {},

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
      const { editedExpenses, originalExpenses } = get();
      return areExpensesChanged(editedExpenses, originalExpenses);
    },

    getSanitizedExpenses: () => {
      const { editedExpenses } = get();
      return sanitizeExpensesForSave(editedExpenses);
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

    startEditing: () => {
      const { workOrder } = get();
      if (!workOrder) return;

      // 経費の編集データを準備
      const expenseDrafts = workOrder.expenses.map(expense =>
        normalizeExpense({
          ...expense,
          manualBillOverride: determineManualOverride(expense),
        })
      );

      // 単価の編集データを準備
      const initialRates = createInitialEditedRates(workOrder.activities);

      set(() => ({
        isEditing: true,
        editedExpenses: expenseDrafts,
        editedRates: initialRates,
      }));
    },

    cancelEditing: () => {
      set(() => ({
        isEditing: false,
        editedExpenses: [],
        editedRates: {},
      }));
    },

    // ========================================
    // 経費操作
    // ========================================

    addExpense: () => {
      set((state) => ({
        editedExpenses: [...state.editedExpenses, normalizeExpense(createEmptyExpense())],
      }));
    },

    removeExpense: (index) => {
      set((state) => ({
        editedExpenses: state.editedExpenses.filter((_, i) => i !== index),
      }));
    },

    changeCategoryAt: (index, category) => {
      set((state) => {
        const updated = [...state.editedExpenses];
        const target = updated[index];
        if (!target) return {};

        const manualBillOverride = AUTO_MARKUP_CATEGORIES.includes(category)
          ? target.manualBillOverride ?? determineManualOverride(target)
          : true;

        updated[index] = normalizeExpense({
          ...target,
          category,
          manualBillOverride,
        });

        return { editedExpenses: updated };
      });
    },

    changeCostFieldAt: (index, field, value) => {
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
          });
        }

        return { editedExpenses: updated };
      });
    },

    changeBillingFieldAt: (index, field, value) => {
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
          });
        } else if (field === 'billUnitPrice') {
          const billUnitPrice = Math.max(0, numericValue);
          const billTotal = billUnitPrice * (target.billQuantity > 0 ? target.billQuantity : 1);
          updated[index] = normalizeExpense({
            ...target,
            billUnitPrice,
            billTotal,
            manualBillOverride: true,
          });
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
          });
        }

        return { editedExpenses: updated };
      });
    },

    resetBillingAt: (index) => {
      set((state) => {
        const updated = [...state.editedExpenses];
        const target = updated[index];
        if (!target) return {};

        updated[index] = normalizeExpense({
          ...target,
          manualBillOverride: false,
        });

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
    // API送信用
    // ========================================

    getAdjustmentsForAPI: () => {
      const { editedRates, originalActivities } = get();
      return createAdjustmentsForAPI(editedRates, originalActivities);
    },
  };
}

