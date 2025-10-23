/**
 * 経費管理サービス
 * 
 * 材料費・外注費などの経費処理を担当
 */

import { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

/**
 * Prismaトランザクションクライアントの型
 */
type TransactionClient = Omit<
  Prisma.DefaultPrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * 経費データの型
 */
export interface ExpenseInput {
  category: string;
  costUnitPrice: number;
  costQuantity: number;
  costTotal?: number;
  billUnitPrice?: number;
  billQuantity?: number;
  billTotal?: number;
  fileEstimate?: number | null;
  memo?: string;
}

/**
 * 自動マークアップ対象のカテゴリーかチェック
 */
function shouldApplyAutoMarkup(category: string): boolean {
  return ['materials', 'outsourcing', 'shipping'].includes(category);
}

/**
 * 原価計算を正規化
 */
function normalizeCostCalculation(expense: ExpenseInput): {
  safeCostUnitPrice: number;
  safeCostQuantity: number;
  costTotal: number;
} {
  const safeCostUnitPrice = Number.isFinite(expense.costUnitPrice) ? Math.max(0, expense.costUnitPrice) : 0;
  const safeCostQuantity = Number.isFinite(expense.costQuantity) ? Math.max(1, expense.costQuantity) : 1;
  const computedCostTotal = safeCostUnitPrice * safeCostQuantity;
  const costTotal = Number.isFinite(expense.costTotal) && (expense.costTotal ?? 0) > 0 
    ? (expense.costTotal ?? 0)
    : computedCostTotal;

  return { safeCostUnitPrice, safeCostQuantity, costTotal };
}

/**
 * 請求数量を正規化
 */
function normalizeBillQuantity(expense: ExpenseInput, safeCostQuantity: number): number {
  let billQuantity = Number.isFinite(expense.billQuantity) && (expense.billQuantity ?? 0) > 0
    ? Number(expense.billQuantity)
    : safeCostQuantity;

  if (billQuantity <= 0) {
    billQuantity = safeCostQuantity;
  }

  return billQuantity;
}

/**
 * 請求合計を計算
 */
function calculateBillTotal(
  expense: ExpenseInput,
  costTotal: number,
  category: string,
  billQuantity: number
): number {
  // 明示的にbillTotalが指定されている場合はそれを使用
  if (typeof expense.billTotal === 'number' && expense.billTotal >= 0) {
    return expense.billTotal;
  }

  // 自動マークアップ対象の場合は1.2倍
  if (shouldApplyAutoMarkup(category)) {
    return Math.ceil(costTotal * 1.2);
  }

  // その他の場合は単価×数量
  const fallbackUnitPrice = Number.isFinite(expense.billUnitPrice ?? 0) 
    ? Math.max(0, expense.billUnitPrice ?? 0) 
    : 0;
  return fallbackUnitPrice * billQuantity;
}

/**
 * 請求単価を計算
 */
function calculateBillUnitPrice(billTotal: number, billQuantity: number): number {
  return billQuantity > 0 ? Math.ceil(billTotal / billQuantity) : billTotal;
}

/**
 * 経費データを1件作成
 */
async function createExpense(
  workOrderId: string,
  expense: ExpenseInput,
  tx: TransactionClient
): Promise<void> {
  const category = expense.category.trim();
  if (!category) {
    return;
  }

  // 原価計算
  const { safeCostUnitPrice, safeCostQuantity, costTotal } = normalizeCostCalculation(expense);

  // 請求数量
  const billQuantity = normalizeBillQuantity(expense, safeCostQuantity);

  // 請求合計
  const billTotal = calculateBillTotal(expense, costTotal, category, billQuantity);

  // 請求単価
  const billUnitPrice = calculateBillUnitPrice(billTotal, billQuantity);

  // データベースに作成
  await tx.material.create({
    data: {
      workOrderId,
      category,
      costUnitPrice: safeCostUnitPrice,
      costQuantity: safeCostQuantity,
      costTotal,
      billUnitPrice,
      billQuantity,
      billTotal,
      fileEstimate: typeof expense.fileEstimate === 'number' ? expense.fileEstimate : null,
      memo: expense.memo || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  });
}

/**
 * 経費を置き換え（既存をすべて削除して新規作成）
 * 
 * @param workOrderId 工番ID
 * @param expenses 経費データの配列
 * @param tx Prismaトランザクション
 */
export async function replaceExpenses(
  workOrderId: string,
  expenses: ExpenseInput[],
  tx: TransactionClient
): Promise<void> {
  // 既存の経費をすべて削除
  await tx.material.deleteMany({
    where: { workOrderId },
  });

  // 新しい経費を作成
  for (const expense of expenses) {
    await createExpense(workOrderId, expense, tx);
  }

  logger.info(`Replaced expenses for work order ${workOrderId}: ${expenses.length} items`);
}

