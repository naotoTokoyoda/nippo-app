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

/**
 * 集計履歴取得のクエリパラメータスキーマ
 */
export const aggregationHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  search: z.string().optional(),
  customerName: z.string().optional(),
  periodType: z.enum(['month', 'year', 'all', 'custom']).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}$/).optional(), // YYYY-MM形式
  endDate: z.string().regex(/^\d{4}-\d{2}$/).optional(),   // YYYY-MM形式
  sortBy: z.enum(['workNumber', 'completedAt', 'totalHours']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type AggregationHistoryQuery = z.infer<typeof aggregationHistoryQuerySchema>;

