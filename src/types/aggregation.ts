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

export interface Material {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  totalAmount: number;
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
  materials: Material[];
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
