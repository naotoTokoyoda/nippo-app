import { ExpenseItem, ExpenseCategory, EditableExpenseItem } from '@/types/aggregation';

/**
 * 自動マークアップ対象カテゴリ（原価の1.2倍が請求額になる）
 */
export const AUTO_MARKUP_CATEGORIES: ExpenseCategory[] = ['materials', 'outsourcing', 'shipping'];

/**
 * 経費カテゴリのオプション
 */
export const EXPENSE_CATEGORY_OPTIONS: Array<{ value: ExpenseCategory; label: string }> = [
  { value: 'materials', label: '材料費' },
  { value: 'outsourcing', label: '外注費' },
  { value: 'shipping', label: '送料' },
  { value: 'other', label: 'その他' },
];

/**
 * 編集可能な経費アイテム（手動上書きフラグを含む）
 * @deprecated types/aggregation.tsのEditableExpenseItemを使用してください
 */
export type EditableExpense = EditableExpenseItem;

/**
 * 数値文字列を整数にパースする
 */
export function parseInteger(value: string | number, fallback = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (value === '') {
    return fallback;
  }

  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * 経費が手動上書きされているかを判定する
 * 自動マークアップ対象カテゴリで、請求額が原価×1.2と異なる場合はtrue
 */
export function determineManualOverride(expense: ExpenseItem | EditableExpenseItem): boolean {
  if (!AUTO_MARKUP_CATEGORIES.includes(expense.category)) {
    return true;
  }

  const baselineCostTotal = expense.costTotal ?? expense.costUnitPrice * expense.costQuantity;
  const expectedBillTotal = Math.ceil(baselineCostTotal * 1.2);
  return expense.billTotal !== expectedBillTotal;
}

/**
 * 空の経費アイテムを作成
 */
export function createEmptyExpense(): EditableExpenseItem {
  return {
    id: `temp-${Date.now()}`,
    category: 'materials',
    costUnitPrice: 0,
    costQuantity: 1,
    costTotal: 0,
    billUnitPrice: 0,
    billQuantity: 1,
    billTotal: 0,
    fileEstimate: null,
    manualBillOverride: false,
  };
}

/**
 * 経費アイテムを正規化する
 * - 原価の計算
 * - 自動マークアップの適用（該当カテゴリかつ手動上書きでない場合）
 * - 請求額の計算
 */
export function normalizeExpense(expense: EditableExpenseItem): EditableExpenseItem {
  // 原価計算
  const safeCostUnitPrice = Number.isFinite(expense.costUnitPrice) ? Math.max(0, expense.costUnitPrice) : 0;
  const safeCostQuantity = Number.isFinite(expense.costQuantity) ? Math.max(1, expense.costQuantity) : 1;
  const costTotal = safeCostUnitPrice * safeCostQuantity;

  let updated: EditableExpenseItem = {
    ...expense,
    costUnitPrice: safeCostUnitPrice,
    costQuantity: safeCostQuantity,
    costTotal,
  };

  const requiresAutoMarkup = !updated.manualBillOverride && AUTO_MARKUP_CATEGORIES.includes(updated.category);

  if (requiresAutoMarkup) {
    // 自動マークアップ: 原価 × 1.2
    const billQuantity = safeCostQuantity;
    const billTotal = Math.ceil(costTotal * 1.2);
    const billUnitPrice = billQuantity > 0 ? Math.ceil(billTotal / billQuantity) : billTotal;
    updated = {
      ...updated,
      billQuantity,
      billUnitPrice,
      billTotal,
    };
  } else {
    // 手動設定または自動マークアップ対象外
    const safeBillQuantity = Number.isFinite(updated.billQuantity) ? Math.max(1, updated.billQuantity) : 1;
    const providedBillUnitPrice = Number.isFinite(updated.billUnitPrice) ? Math.max(0, updated.billUnitPrice) : 0;
    const providedBillTotal =
      Number.isFinite(updated.billTotal) && updated.billTotal !== undefined && updated.billTotal >= 0
        ? Number(updated.billTotal)
        : providedBillUnitPrice * safeBillQuantity;
    const derivedBillUnitPrice = safeBillQuantity > 0 && providedBillTotal > 0
      ? Math.ceil(providedBillTotal / safeBillQuantity)
      : providedBillUnitPrice;
    updated = {
      ...updated,
      billQuantity: safeBillQuantity,
      billUnitPrice: providedBillUnitPrice > 0 ? providedBillUnitPrice : derivedBillUnitPrice,
      billTotal: providedBillTotal,
    };
  }

  return updated;
}

/**
 * 保存用に経費リストをサニタイズする
 * - 正規化を適用
 * - 空データ（原価・請求額・見積がすべて0）を除外
 * - 内部フラグを除去
 */
export function sanitizeExpensesForSave(expenses: EditableExpenseItem[]): ExpenseItem[] {
  return expenses
    .map(expense => normalizeExpense(expense))
    .filter(expense => expense.costTotal > 0 || expense.billTotal > 0 || (expense.fileEstimate ?? 0) > 0)
    .map(expense => ({
      id: expense.id,
      category: expense.category,
      costUnitPrice: expense.costUnitPrice,
      costQuantity: expense.costQuantity,
      costTotal: expense.costTotal,
      billUnitPrice: expense.billUnitPrice,
      billQuantity: expense.billQuantity,
      billTotal: expense.billTotal,
      fileEstimate: expense.fileEstimate ?? null,
      memo: expense.memo || undefined,
    }));
}

/**
 * 経費リストが変更されたかを判定する
 */
export function areExpensesChanged(
  current: EditableExpenseItem[],
  original: ExpenseItem[]
): boolean {
  const sanitizedCurrent = sanitizeExpensesForSave(current);

  const sanitizedOriginal = original
    .filter(expense => expense.costTotal > 0 || expense.billTotal > 0 || (expense.fileEstimate ?? 0) > 0)
    .map(expense => ({
      ...expense,
      fileEstimate: expense.fileEstimate ?? null,
    }));

  const toComparable = (expense: ExpenseItem) => ({
    category: expense.category,
    costUnitPrice: expense.costUnitPrice,
    costQuantity: expense.costQuantity,
    costTotal: expense.costTotal,
    billUnitPrice: expense.billUnitPrice,
    billQuantity: expense.billQuantity,
    billTotal: expense.billTotal,
    fileEstimate: expense.fileEstimate ?? null,
    memo: expense.memo || undefined,
  });

  const sortKey = (expense: ReturnType<typeof toComparable>) =>
    `${expense.category}:${expense.costUnitPrice}:${expense.costQuantity}:${expense.costTotal}:${expense.billUnitPrice}:${expense.billQuantity}:${expense.billTotal}:${expense.fileEstimate ?? ''}:${expense.memo ?? ''}`;

  const compareList = (list: ExpenseItem[]) =>
    list.map(toComparable).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

  return JSON.stringify(compareList(sanitizedCurrent)) !== JSON.stringify(compareList(sanitizedOriginal));
}

