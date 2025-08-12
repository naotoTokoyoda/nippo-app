// データベースから取得するレポートの型定義
export interface DatabaseReport {
  id: string;
  date: string;
  workerName: string;
  submittedAt: string;
  workItems: DatabaseWorkItem[];
}

// データベースから取得する作業項目の型定義
export interface DatabaseWorkItem {
  id: string;
  reportId: string;
  reportDate: string;
  workerName: string;
  customerName: string;
  workNumberFront: string;
  workNumberBack: string;
  name: string;
  startTime: string;
  endTime: string;
  machineType: string;
  remarks: string;
  workStatus: string;
}

// APIレスポンスの型定義
export interface ReportsApiResponse {
  success: boolean;
  data: DatabaseReport[];
  filteredItems: DatabaseWorkItem[];
  error?: string;
}

// 作業項目更新APIレスポンスの型定義
export interface UpdateWorkItemApiResponse {
  success: boolean;
  message: string;
  data: DatabaseWorkItem;
  error?: string;
}
