// フィードバック機能用の型定義

export type FeedbackType = 
  | 'bug'          // バグ報告
  | 'feature'      // 新機能要望
  | 'improvement'  // 機能改善提案
  | 'ui'           // UI/UX改善
  | 'performance'  // パフォーマンス
  | 'other';       // その他

export type FeedbackPriority = 'high' | 'medium' | 'low';

export interface FeedbackData {
  // 必須項目
  type: FeedbackType;
  message: string;
  
  // 任意項目
  email?: string;           // 連絡先（回答希望時）
  priority?: FeedbackPriority;
  
  // 自動収集項目
  userAgent?: string;       // ブラウザ情報
  url?: string;            // 発生ページURL
  timestamp?: string;      // 送信日時
  appVersion?: string;     // アプリバージョン
}

export interface FeedbackFormData {
  type: FeedbackType;
  message: string;
  email?: string;
  priority?: FeedbackPriority;
}

// フィードバックタイプのラベル定義
export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  bug: '🐛 バグ報告',
  feature: '✨ 新機能要望',
  improvement: '💡 機能改善提案',
  ui: '🎨 UI/UX改善',
  performance: '🚀 パフォーマンス改善',
  other: '💬 その他のご意見'
};

// 優先度のラベル定義
export const PRIORITY_LABELS: Record<FeedbackPriority, string> = {
  high: '🔴 高（緊急）',
  medium: '🟡 中（改善希望）',
  low: '🟢 低（余裕があるとき）'
};

// APIレスポンス型
export interface FeedbackResponse {
  success: boolean;
  message: string;
  error?: string;
}
