import { z } from 'zod';

/**
 * 集計詳細更新のバリデーションスキーマ
 */
export const updateAggregationSchema = z.object({
  // 単価調整
  billRateAdjustments: z.record(
    z.string(),
    z.object({
      billRate: z.number(),
      memo: z.string().max(50).optional(),
    })
  ).optional(),
  
  // 経費
  expenses: z.array(
    z.object({
      id: z.string().optional(),
      category: z.string(),
      costUnitPrice: z.number(),
      costQuantity: z.number(),
      costTotal: z.number(),
      billUnitPrice: z.number().optional(),
      billQuantity: z.number().optional(),
      billTotal: z.number().optional(),
      fileEstimate: z.number().nullable().optional(),
      memo: z.string().max(50).optional(),
    })
  ).optional(),
  
  // ステータス
  status: z.enum(['delivered', 'aggregating', 'aggregated']).optional(),
  
  // 見積もり金額・最終決定金額・納品日
  estimateAmount: z.number().int().nonnegative().nullable().optional(),
  finalDecisionAmount: z.number().int().nonnegative().nullable().optional(),
  deliveryDate: z.string().nullable().optional(),
});

/**
 * 集計更新データの型
 */
export type UpdateAggregationData = z.infer<typeof updateAggregationSchema>;

