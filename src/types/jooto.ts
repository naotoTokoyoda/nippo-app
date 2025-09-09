/**
 * Jooto API関連の型定義
 */

// Jooto APIのタスク検索レスポンス
export interface JootoTask {
  id: number;
  task_number: number;
  name: string; // タスクのタイトル（例: "TMT　6028-14105"）
  description: string; // タスクの説明（例: "プローブホルダー　長さ160"）
  created_at: string;
  updated_at: string;
  start_date_time?: string;
  deadline_date_time?: string;
  board_id: number;
  list_id: number;
  creator_id: number;
  categories: JootoCategory[];
  checklists: unknown[];
  comments: JootoComment[];
  archived: boolean;
  followed: boolean;
  status: string;
  work_start_at?: string | null;
  work_end_at?: string | null;
}

export interface JootoCategory {
  id: number;
  board_id: number;
  color: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface JootoComment {
  id: number;
  created_at: string;
  updated_at: string;
  task_id: number;
  attachments: unknown[];
  content: string;
  mentioned_users: unknown[];
  sender: {
    id: number;
    name: string;
    display_name: string;
  };
}

export interface JootoSearchResponse {
  tasks: JootoTask[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

// 工番検索結果
export interface WorkNumberSearchResult {
  workNumber: string;
  workNumberFront: string;
  workNumberBack: string;
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
