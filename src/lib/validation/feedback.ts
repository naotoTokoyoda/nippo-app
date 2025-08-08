import { z } from 'zod';

// フィードバックタイプの定義
export const FeedbackTypeSchema = z.enum([
  'bug',
  'feature', 
  'improvement',
  'ui',
  'performance',
  'other'
]);

// 優先度の定義
export const FeedbackPrioritySchema = z.enum(['high', 'medium', 'low']);

// フィードバックデータのバリデーションスキーマ
export const FeedbackDataSchema = z.object({
  type: FeedbackTypeSchema,
  message: z.string().min(1, 'メッセージは必須です').max(1000, 'メッセージは1000文字以内で入力してください'),
  email: z.string().min(1).email('有効なメールアドレスを入力してください').optional().or(z.literal('')),
  priority: FeedbackPrioritySchema.optional(),
});

// APIリクエストのバリデーションスキーマ
export const FeedbackRequestSchema = z.object({
  type: FeedbackTypeSchema,
  message: z.string().min(1, 'メッセージは必須です').max(1000, 'メッセージは1000文字以内で入力してください'),
  email: z.string().min(1).email('有効なメールアドレスを入力してください').optional().or(z.literal('')),
  priority: FeedbackPrioritySchema.optional(),
});

// 型定義のエクスポート
export type FeedbackData = z.infer<typeof FeedbackDataSchema>;
export type FeedbackRequest = z.infer<typeof FeedbackRequestSchema>;
export type FeedbackType = z.infer<typeof FeedbackTypeSchema>;
export type FeedbackPriority = z.infer<typeof FeedbackPrioritySchema>;
