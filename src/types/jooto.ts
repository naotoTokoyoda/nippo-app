/**
 * Jooto API関連の型定義
 */

// Jooto APIのタスク検索レスポンス
export interface JootoTask {
  id: number;
  title: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
  // 他のプロパティは必要に応じて追加
}

export interface JootoSearchResponse {
  tasks: JootoTask[];
  total_count: number;
  page: number;
  per_page: number;
}

// 工番検索結果
export interface WorkNumberSearchResult {
  workNumber: string;
  customerName: string;
  workName: string;
  taskId: number;
}

// API呼び出し用の設定
export interface JootoApiConfig {
  apiKey: string;
  boardId: string;
  baseUrl: string;
}
