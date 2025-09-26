export interface ActivitySummary {
  activity: string;
  activityName: string;
  hours: number;
  costRate: number;
  billRate: number;
  costAmount: number;
  billAmount: number;
  adjustment: number;
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
  status: 'aggregating' | 'aggregated';
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

export interface ActivityBillAmount {
  currentBillRate: number;
  currentBillAmount: number;
}

export type ActivityBillAmountMap = Record<string, ActivityBillAmount>;
