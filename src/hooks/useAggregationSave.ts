import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ExpenseItem, RateChange } from '@/types/aggregation';

interface SaveData {
  adjustmentsForAPI: Record<string, { billRate: number; memo: string }>;
  expensePayload: ExpenseItem[];
  estimateAmount?: number | null;
  finalDecisionAmount?: number | null;
  deliveryDate?: string | null;
}

interface UseAggregationSaveProps {
  workOrderId: string;
  onSaveSuccess: () => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
}

/**
 * 集計データ保存のカスタムフック
 * 
 * 単価・経費の保存、集計完了処理などを担当する
 */
export function useAggregationSave({
  workOrderId,
  onSaveSuccess,
  onShowToast,
}: UseAggregationSaveProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [pendingRateChanges, setPendingRateChanges] = useState<RateChange[]>([]);
  const [pendingExpenseSnapshot, setPendingExpenseSnapshot] = useState<ExpenseItem[]>([]);

  /**
   * 保存確認モーダルを開く
   */
  const openSaveConfirm = useCallback(
    (rateChanges: RateChange[], expenses: ExpenseItem[]) => {
      setPendingRateChanges(rateChanges);
      setPendingExpenseSnapshot(expenses);
      setShowSaveConfirm(true);
    },
    []
  );

  /**
   * 保存確認モーダルを閉じる
   */
  const closeSaveConfirm = useCallback(() => {
    setShowSaveConfirm(false);
  }, []);

  /**
   * 変更を保存する
   */
  const saveChanges = useCallback(
    async (saveData: SaveData) => {
      try {
        setIsSaving(true);

        const response = await fetch(`/api/aggregation/${workOrderId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            billRateAdjustments: saveData.adjustmentsForAPI,
            expenses: saveData.expensePayload,
            estimateAmount: saveData.estimateAmount,
            finalDecisionAmount: saveData.finalDecisionAmount,
            deliveryDate: saveData.deliveryDate,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '保存に失敗しました');
        }

        setShowSaveConfirm(false);
        setPendingRateChanges([]);
        setPendingExpenseSnapshot([]);

        onSaveSuccess();
        onShowToast('単価の更新が保存されました', 'success');
      } catch (error) {
        console.error('保存エラー:', error);
        onShowToast(error instanceof Error ? error.message : '保存中にエラーが発生しました', 'error');
      } finally {
        setIsSaving(false);
      }
    },
    [workOrderId, onSaveSuccess, onShowToast]
  );

  /**
   * 集計を完了する
   */
  const finalizeAggregation = useCallback(async () => {
    if (!confirm('集計を完了しますか？完了後は編集できなくなります。')) {
      return;
    }

    try {
      const response = await fetch(`/api/aggregation/${workOrderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'aggregated',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '完了処理に失敗しました');
      }

      onShowToast('集計が完了されました', 'success');
      router.push('/aggregation');
    } catch (error) {
      console.error('完了エラー:', error);
      onShowToast(error instanceof Error ? error.message : '完了処理中にエラーが発生しました', 'error');
    }
  }, [workOrderId, onShowToast, router]);

  /**
   * 保留中のデータをクリア
   */
  const clearPendingData = useCallback(() => {
    setPendingRateChanges([]);
    setPendingExpenseSnapshot([]);
  }, []);

  return {
    // 状態
    isSaving,
    showSaveConfirm,
    pendingRateChanges,
    pendingExpenseSnapshot,

    // アクション
    openSaveConfirm,
    closeSaveConfirm,
    saveChanges,
    finalizeAggregation,
    clearPendingData,
  };
}

