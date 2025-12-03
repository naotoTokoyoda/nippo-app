// 日報機能用の型定義

// 勤務状況の定数
export const WORK_STATUS_OPTIONS = [
  { value: 'normal', label: '通常' },
  { value: 'lunch_overtime', label: '昼残' },
  { value: 'early_leave', label: '早退' },
  { value: 'late_arrival', label: '遅刻' },
  { value: 'overtime', label: '残業' },
  { value: 'early_start', label: '早出' }
] as const;

export type WorkStatus = typeof WORK_STATUS_OPTIONS[number]['value'];

export interface WorkItemData {
  id: string;
  customerName: string;
  workNumberFront: string;
  workNumberBack: string;
  name: string;
  startTime: string;
  endTime: string;
  machineType: string;
  workStatus?: string; // オプショナル：勤務状況
  remarks: string;
}

export interface DailyReportData {
  id?: string;
  date: string;
  workerName: string;
  workItems: WorkItemData[];
  submittedAt?: string;
}

// バリデーションエラー型
export interface ValidationError {
  field: string;
  message: string;
}
