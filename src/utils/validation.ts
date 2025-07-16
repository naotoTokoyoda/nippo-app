import { z } from 'zod';

// 作業項目のバリデーションスキーマ
export const WorkItemSchema = z.object({
  id: z.string(),
  customerName: z.string().min(1, '客先名は必須です'),
  workNumberFront: z.string().min(1, '工番（前番）は必須です'),
  workNumberBack: z.string().min(1, '工番（後番）は必須です'),
  name: z.string().min(1, '名称は必須です'),
  startTime: z.string().min(1, '作業開始時間は必須です'),
  endTime: z.string().min(1, '作業終了時間は必須です'),
  machineType: z.string().min(1, '機械種類は必須です'),
  remarks: z.string().optional() // 備考は任意
});

// 日報データのバリデーションスキーマ
export const DailyReportSchema = z.object({
  date: z.string().min(1, '日付は必須です'),
  workerName: z.string().min(1, '作業者名は必須です'),
  workItems: z.array(WorkItemSchema).min(1, '作業項目は1つ以上必要です')
});

// バリデーションエラーの型
export type ValidationError = {
  field: string;
  message: string;
};

// バリデーション関数
export function validateWorkItem(data: unknown): { success: boolean; errors?: ValidationError[] } {
  const result = WorkItemSchema.safeParse(data);
  
  if (result.success) {
    return { success: true };
  } else {
    const errors: ValidationError[] = result.error.issues.map(issue => ({
      field: Array.isArray(issue.path) ? issue.path.join('.') : String(issue.path),
      message: issue.message
    }));
    return { success: false, errors };
  }
}

export function validateDailyReport(data: unknown): { success: boolean; errors?: ValidationError[] } {
  const result = DailyReportSchema.safeParse(data);
  
  if (result.success) {
    return { success: true };
  } else {
    const errors: ValidationError[] = result.error.issues.map(issue => ({
      field: Array.isArray(issue.path) ? issue.path.join('.') : String(issue.path),
      message: issue.message
    }));
    return { success: false, errors };
  }
}

// フィールド名の日本語マッピング
export const fieldNameMap: Record<string, string> = {
  'customerName': '客先名',
  'workNumberFront': '工番（前番）',
  'workNumberBack': '工番（後番）',
  'name': '名称',
  'startTime': '作業開始時間',
  'endTime': '作業終了時間',
  'machineType': '機械種類',
  'date': '日付',
  'workerName': '作業者名',
  'workItems': '作業項目'
}; 