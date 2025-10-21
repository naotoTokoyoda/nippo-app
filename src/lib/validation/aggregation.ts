/**
 * 集計機能用バリデーションスキーマ
 */

import { z } from 'zod';

/**
 * 集計一覧取得のクエリパラメータスキーマ
 */
export const aggregationListQuerySchema = z.object({
  term: z.string().optional(),
  customer: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['aggregating', 'aggregated']).optional().default('aggregating'),
});

export type AggregationListQuery = z.infer<typeof aggregationListQuerySchema>;

