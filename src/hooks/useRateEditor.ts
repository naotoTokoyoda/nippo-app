import { useState, useCallback, useMemo } from 'react';
import { ActivitySummary, EditedRates, RateChange } from '@/types/aggregation';
import {
  calculateActivityBillAmounts,
  calculateBillLaborSubtotal,
  calculateAdjustmentTotal,
  calculateRateChanges,
  hasRateChanges as checkRateChanges,
  hasMemoOnlyChanges,
  applyEditedMemos,
  createInitialEditedRates,
  createAdjustmentsForAPI,
  ActivityBillAmountMap,
} from '@/lib/aggregation/rate-utils';

/**
 * 単価編集のカスタムフック
 * 
 * 労務費の単価・メモの編集、請求額の計算、
 * 調整額の計算などを担当する
 */
export function useRateEditor(activities: ActivitySummary[] = []) {
  const [editedRates, setEditedRates] = useState<EditedRates>({});

  /**
   * 編集を開始する（初期化）
   */
  const startEditing = useCallback((activitiesToEdit: ActivitySummary[]) => {
    const initialRates = createInitialEditedRates(activitiesToEdit);
    setEditedRates(initialRates);
  }, []);

  /**
   * 編集をキャンセル
   */
  const cancelEditing = useCallback(() => {
    setEditedRates({});
  }, []);

  /**
   * 単価またはメモを編集
   */
  const editRate = useCallback(
    (activity: string, field: 'billRate' | 'memo', value: string) => {
      setEditedRates((prev) => ({
        ...prev,
        [activity]: {
          ...prev[activity],
          [field]: value,
        },
      }));
    },
    []
  );

  /**
   * 活動ごとの請求額マップ
   */
  const activityBillAmounts = useMemo<ActivityBillAmountMap>(
    () => calculateActivityBillAmounts(activities, editedRates),
    [activities, editedRates]
  );

  /**
   * 労務費請求額の小計
   */
  const billLaborSubtotal = useMemo(
    () => calculateBillLaborSubtotal(activityBillAmounts),
    [activityBillAmounts]
  );

  /**
   * 調整額の合計
   */
  const adjustmentTotal = useMemo(
    () => calculateAdjustmentTotal(activities, editedRates),
    [activities, editedRates]
  );

  /**
   * 単価変更のリスト
   */
  const rateChanges = useMemo<RateChange[]>(
    () => calculateRateChanges(activities, editedRates),
    [activities, editedRates]
  );

  /**
   * 単価に変更があるか
   */
  const hasChanges = useMemo(
    () => checkRateChanges(rateChanges) || hasMemoOnlyChanges(activities, editedRates),
    [rateChanges, activities, editedRates]
  );

  /**
   * 表示用の活動リスト（編集されたメモを適用）
   */
  const activitiesForDisplay = useMemo(
    () => applyEditedMemos(activities, editedRates),
    [activities, editedRates]
  );

  /**
   * API送信用の調整データを作成
   */
  const getAdjustmentsForAPI = useCallback(() => {
    return createAdjustmentsForAPI(editedRates, activities);
  }, [editedRates, activities]);

  return {
    // 状態
    editedRates,
    activityBillAmounts,
    billLaborSubtotal,
    adjustmentTotal,
    rateChanges,
    hasChanges,
    activitiesForDisplay,
    
    // アクション
    startEditing,
    cancelEditing,
    editRate,
    getAdjustmentsForAPI,
  };
}

