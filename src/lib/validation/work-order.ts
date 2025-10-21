/**
 * 工番管理用バリデーションスキーマ
 */

import { z } from 'zod';

/**
 * 工番登録用スキーマ
 */
export const createWorkOrderSchema = z.object({
  frontNumber: z.string().min(4).max(4).regex(/^\d{4}$/, '工番（前番）は4桁の数字で入力してください'),
  backNumber: z.string().min(1, '工番（後番）は必須です'),
  customerId: z.string().min(1, '顧客は必須です'),
  projectName: z.string().min(1, '作業名称は必須です'),
  handling: z.string().optional(),
  quantity: z.number().optional(),
});

export type CreateWorkOrder = z.infer<typeof createWorkOrderSchema>;

