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
 * システムユーザーのIDを取得または作成
 * 
 * @param tx Prismaトランザクション
 * @returns システムユーザーID
 */
async function getOrCreateSystemUserId(tx: TransactionClient): Promise<string> {
  let systemUserId: string;
  const existingUser = await tx.user.findFirst({
    where: { name: 'システム' }
  });
  
  if (existingUser) {
    systemUserId = existingUser.id;
  } else {
    // システムユーザーを作成
    const systemUser = await tx.user.create({
      data: {
        name: 'システム',
      },
    });
    systemUserId = systemUser.id;
  }
  
  return systemUserId;
}

/**
 * 経費変更の調整履歴を作成
 * 
 * @param workOrderId 工番ID
 * @param oldExpenses 旧経費データ
 * @param newExpenses 新経費データ
 * @param userId 操作ユーザーID
 * @param tx Prismaトランザクション
 */
async function createExpenseChangeHistory(
  workOrderId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oldExpenses: any[],
  newExpenses: ExpenseInput[],
  userId: string | undefined,
  tx: TransactionClient
): Promise<void> {
  // ユーザーIDが指定されている場合は存在確認
  let effectiveUserId: string;
  if (userId) {
    const userExists = await tx.user.findUnique({
      where: { id: userId },
    });
    effectiveUserId = userExists ? userId : await getOrCreateSystemUserId(tx);
  } else {
    effectiveUserId = await getOrCreateSystemUserId(tx);
  }

  // 旧経費をマップ化（カテゴリごとに集計）
  const oldExpenseMap = new Map<string, number>();
  oldExpenses.forEach((expense) => {
    const category = expense.category;
    const billTotal = expense.billTotal || 0;
    oldExpenseMap.set(category, (oldExpenseMap.get(category) || 0) + billTotal);
  });

  // 新経費をマップ化（カテゴリごとに集計）
  const newExpenseMap = new Map<string, number>();
  newExpenses.forEach((expense) => {
    const category = expense.category.trim();
    if (!category) return;
    
    // 請求合計を計算
    const { safeCostUnitPrice, safeCostQuantity, costTotal } = normalizeCostCalculation(expense);
    const billQuantity = normalizeBillQuantity(expense, safeCostQuantity);
    const billTotal = calculateBillTotal(expense, costTotal, category, billQuantity);
    
    newExpenseMap.set(category, (newExpenseMap.get(category) || 0) + billTotal);
  });

  // 変更を検出して履歴を作成
  const allCategories = new Set([...oldExpenseMap.keys(), ...newExpenseMap.keys()]);
  
  for (const category of allCategories) {
    const oldAmount = oldExpenseMap.get(category) || 0;
    const newAmount = newExpenseMap.get(category) || 0;
    const difference = newAmount - oldAmount;

    if (difference !== 0) {
      let reason: string;
      if (oldAmount === 0) {
        reason = `${category} 追加`;
      } else if (newAmount === 0) {
        reason = `${category} 削除`;
      } else {
        reason = `${category} 変更 (¥${oldAmount.toLocaleString()} → ¥${newAmount.toLocaleString()})`;
      }

      await tx.adjustment.create({
        data: {
          workOrderId,
          type: 'expense_change',
          amount: difference,
          reason,
          memo: null,
          createdBy: effectiveUserId,
        },
      });

      logger.info(`Created expense change history: ${reason}, adjustment: ${difference}`);
    }
  }
}

/**
 * 経費を置き換え（既存をすべて削除して新規作成）
 * 
 * @param workOrderId 工番ID
 * @param expenses 経費データの配列
 * @param userId 操作ユーザーID（省略時はシステムユーザー）
 * @param tx Prismaトランザクション
 */
export async function replaceExpenses(
  workOrderId: string,
  expenses: ExpenseInput[],
  tx: TransactionClient,
  userId?: string
): Promise<void> {
  // 既存の経費を取得（履歴記録用）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oldExpenses = await (tx as any).material.findMany({
    where: { workOrderId },
  });

  // 経費変更の調整履歴を作成
  await createExpenseChangeHistory(workOrderId, oldExpenses, expenses, userId, tx);

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

