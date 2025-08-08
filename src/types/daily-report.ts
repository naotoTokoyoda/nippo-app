// 日報機能用の型定義

export interface WorkItemData {
  id: string;
  customerName: string;
  workNumberFront: string;
  workNumberBack: string;
  name: string;
  startTime: string;
  endTime: string;
  machineType: string;
  remarks: string;
}

export interface DailyReportData {
  id?: string;
  date: string;
  workerName: string;
  workItems: WorkItemData[];
  submittedAt?: string;
}

// 作業者オプション
export const WORKER_OPTIONS = [
  '橋本正朗',
  '常世田博',
  '野城喜幸',
  '三好耕平',
  '高梨純一',
  '金谷晶子',
  '（トン）シーワイ チャナラット',
  '（ポーン）テートシームアン タナーポーン',
  '（コー）ジャンペンペーン パッタウィ'
] as const;

export type WorkerName = typeof WORKER_OPTIONS[number];

// バリデーションエラー型
export interface ValidationError {
  field: string;
  message: string;
}
