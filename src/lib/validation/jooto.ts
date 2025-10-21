/**
 * Jooto API用バリデーションスキーマ
 */

import { z } from 'zod';

/**
 * 工番検索パラメータスキーマ
 */
export const searchParamsSchema = z.object({
  workNumber: z.string().min(1, '工番を入力してください').max(50, '工番が長すぎます')
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

