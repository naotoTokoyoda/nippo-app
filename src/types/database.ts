// データベースから取得するレポートの型定義
export interface DatabaseReport {
  id: string;
  date: string; // APIでは文字列として返される
  workerName: string;
  submittedAt: string;
  workItems: DatabaseWorkItem[];
}

// データベースから取得する作業項目の型定義
export interface DatabaseWorkItem {
  id: string;
  reportId: string;
  reportDate: string; // APIでは文字列として返される
  workerName: string;
  customerName: string;
  workNumberFront: string;
  workNumberBack: string;
  name: string;
  startTime: string; // APIでは文字列として返される
  endTime: string; // APIでは文字列として返される
  machineType: string;
  remarks: string;
  workStatus: string;
}

// ページネーション情報の型定義
export interface PaginationInfo {
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// APIレスポンスの型定義
export interface ReportsApiResponse {
  success: boolean;
  data?: DatabaseReport[] | {
    filteredItems?: DatabaseWorkItem[];
    totalCount?: number;
    pagination?: PaginationInfo;
  } | DatabaseWorkItem[];
  filteredItems?: DatabaseWorkItem[];
  totalCount?: number;
  totalReports?: number;
  pagination?: PaginationInfo;
  error?: string;
}

// 作業項目更新APIレスポンスの型定義
export interface UpdateWorkItemApiResponse {
  success: boolean;
  message: string;
  data: DatabaseWorkItem;
  error?: string;
}
