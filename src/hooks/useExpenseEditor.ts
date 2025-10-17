import { useState, useCallback, useMemo } from 'react';
import { ExpenseItem, ExpenseCategory, EditableExpenseItem } from '@/types/aggregation';
import {
  createEmptyExpense,
  normalizeExpense,
  determineManualOverride,
  sanitizeExpensesForSave,
  areExpensesChanged,
  parseInteger,
  AUTO_MARKUP_CATEGORIES,
} from '@/lib/aggregation/expense-utils';

/**
 * 経費編集のカスタムフック
 * 
 * 経費の追加・編集・削除、原価・請求額の自動計算、
 * 手動上書きの管理などを担当する
 */
export function useExpenseEditor(originalExpenses: ExpenseItem[] = []) {
  const [editedExpenses, setEditedExpenses] = useState<EditableExpenseItem[]>([]);

  /**
   * 編集を開始する（初期化）
   */
  const startEditing = useCallback((expenses: ExpenseItem[]) => {
    const expenseDrafts = expenses.map(expense =>
      normalizeExpense({
        ...expense,
        manualBillOverride: determineManualOverride(expense),
      })
    );
    setEditedExpenses(expenseDrafts);
  }, []);

  /**
   * 編集をキャンセル
   */
  const cancelEditing = useCallback(() => {
    setEditedExpenses([]);
  }, []);

  /**
   * 経費を追加
   */
  const addExpense = useCallback(() => {
    setEditedExpenses(prev => [...prev, normalizeExpense(createEmptyExpense())]);
  }, []);

  /**
   * 経費を削除
   */
  const removeExpense = useCallback((index: number) => {
    setEditedExpenses(prev => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * カテゴリを変更
   */
  const changeCategoryAt = useCallback(
    (index: number, category: ExpenseCategory) => {
      setEditedExpenses(prev => {
        const updated = [...prev];
        const target = updated[index];
        if (!target) {
          return prev;
        }

        // カテゴリ変更時、自動マークアップ対象なら既存の上書きフラグを保持
        const manualBillOverride = AUTO_MARKUP_CATEGORIES.includes(category)
          ? target.manualBillOverride ?? determineManualOverride(target)
          : true;

        updated[index] = normalizeExpense({
          ...target,
          category,
          manualBillOverride,
        });

        return updated;
      });
    },
    [],
  );

  /**
   * 原価関連の値を変更（単価・数量・メモ）
   */
  const changeCostFieldAt = useCallback(
    (index: number, field: 'costUnitPrice' | 'costQuantity' | 'memo', value: string | number) => {
      setEditedExpenses(prev => {
        const updated = [...prev];
        const target = updated[index];
        if (!target) {
          return prev;
        }

        if (field === 'memo') {
          // メモの場合は正規化不要
          updated[index] = {
            ...target,
            memo: value as string,
          };
        } else {
          // 原価の単価・数量を変更
          const numericValue = parseInteger(value, field === 'costQuantity' ? 1 : 0);
          updated[index] = normalizeExpense({
            ...target,
            [field]: field === 'costQuantity' ? Math.max(1, numericValue) : Math.max(0, numericValue),
          });
        }

        return updated;
      });
    },
    [],
  );

  /**
   * 請求額関連の値を変更（単価・数量・合計・メモ）
   */
  const changeBillingFieldAt = useCallback(
    (index: number, field: 'billUnitPrice' | 'billQuantity' | 'billTotal' | 'memo', value: string | number) => {
      setEditedExpenses(prev => {
        const updated = [...prev];
        const target = updated[index];
        if (!target) {
          return prev;
        }

        if (field === 'memo') {
          // メモの場合は正規化不要
          updated[index] = {
            ...target,
            memo: value as string,
          };
          return updated;
        }

        const numericValue = parseInteger(value, field === 'billQuantity' ? 1 : 0);

        if (field === 'billQuantity') {
          const billQuantity = Math.max(1, numericValue);
          const billTotal = (target.billUnitPrice ?? 0) * billQuantity;
          updated[index] = normalizeExpense({
            ...target,
            billQuantity,
            billTotal,
            manualBillOverride: true,
          });
        } else if (field === 'billUnitPrice') {
          const billUnitPrice = Math.max(0, numericValue);
          const billTotal = billUnitPrice * (target.billQuantity > 0 ? target.billQuantity : 1);
          updated[index] = normalizeExpense({
            ...target,
            billUnitPrice,
            billTotal,
            manualBillOverride: true,
          });
        } else {
          // billTotal
          const billTotal = Math.max(0, numericValue);
          const quantity = target.billQuantity > 0 ? target.billQuantity : 1;
          const billUnitPrice = quantity > 0 ? Math.ceil(billTotal / quantity) : billTotal;
          updated[index] = normalizeExpense({
            ...target,
            billUnitPrice,
            billTotal,
            manualBillOverride: true,
          });
        }

        return updated;
      });
    },
    [],
  );

  /**
   * 請求額を自動計算にリセット（原価×1.2）
   */
  const resetBillingAt = useCallback((index: number) => {
    setEditedExpenses(prev => {
      const updated = [...prev];
      const target = updated[index];
      if (!target) {
        return prev;
      }

      updated[index] = normalizeExpense({
        ...target,
        manualBillOverride: false,
      });

      return updated;
    });
  }, []);

  /**
   * ファイル見積を変更
   */
  const changeFileEstimateAt = useCallback((index: number, value: string | number) => {
    setEditedExpenses(prev => {
      const updated = [...prev];
      const target = updated[index];
      if (!target) {
        return prev;
      }

      const parsedValue = parseInteger(value, 0);

      updated[index] = {
        ...target,
        fileEstimate: value === '' ? null : parsedValue,
      };

      return updated;
    });
  }, []);

  /**
   * 保存用にサニタイズされた経費リスト
   */
  const sanitizedExpenses = useMemo(
    () => sanitizeExpensesForSave(editedExpenses),
    [editedExpenses]
  );

  /**
   * 元の経費から変更があったか
   */
  const hasChanges = useMemo(
    () => areExpensesChanged(editedExpenses, originalExpenses),
    [editedExpenses, originalExpenses]
  );

  /**
   * 原価小計
   */
  const costSubtotal = useMemo(
    () => editedExpenses.reduce((sum, expense) => sum + expense.costTotal, 0),
    [editedExpenses]
  );

  /**
   * 請求額小計
   */
  const billSubtotal = useMemo(
    () => editedExpenses.reduce((sum, expense) => sum + expense.billTotal, 0),
    [editedExpenses]
  );

  return {
    // 状態
    editedExpenses,
    sanitizedExpenses,
    hasChanges,
    costSubtotal,
    billSubtotal,
    
    // アクション
    startEditing,
    cancelEditing,
    addExpense,
    removeExpense,
    changeCategoryAt,
    changeCostFieldAt,
    changeBillingFieldAt,
    resetBillingAt,
    changeFileEstimateAt,
  };
}

