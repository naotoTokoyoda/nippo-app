export interface ActivitySummary {
  activity: string;
  activityName: string;
  hours: number;
  costRate: number;
  billRate: number;
  costAmount: number;
  billAmount: number;
  adjustment: number;
  memo?: string;
}

export type ExpenseCategory = 'materials' | 'outsourcing' | 'shipping' | 'other';

export interface ExpenseItem {
  id: string;
  category: ExpenseCategory;
  costUnitPrice: number;
  costQuantity: number;
  costTotal: number;
  billUnitPrice: number;
  billQuantity: number;
  billTotal: number;
  fileEstimate?: number | null;
  memo?: string;
}

/**
 * 編集可能な経費アイテム（手動上書きフラグを含む）
 */
export interface EditableExpenseItem extends ExpenseItem {
  manualBillOverride?: boolean;
}

export interface AggregationAdjustment {
  id: string;
  type: string;
  amount: number;
  reason: string;
  memo?: string;
  createdAt: string;
  createdBy: string;
}

export interface WorkOrderDetail {
  id: string;
  workNumber: string;
  customerName: string;
  projectName: string;
  term: string;
  status: 'delivered' | 'aggregating' | 'aggregated';
  totalHours: number;
  activities: ActivitySummary[];
  expenses: ExpenseItem[];
  adjustments: AggregationAdjustment[];
}

export interface EditedRate {
  billRate: string;
  memo: string;
}

export type EditedRates = Record<string, EditedRate>;

/**
 * 単価変更の情報
 */
export interface RateChange {
  activity: string;
  activityName: string;
  oldRate: number;
  newRate: number;
  memo: string;
  hours: number;
  adjustment: number;
}

export interface ActivityBillAmount {
  currentBillRate: number;
  currentBillAmount: number;
}

export type ActivityBillAmountMap = Record<string, ActivityBillAmount>;

export interface EditedExpense {
  billUnitPrice: string;
  billQuantity: string;
  billTotal: string;
  memo: string;
}

export type EditedExpenses = Record<string, EditedExpense>;
