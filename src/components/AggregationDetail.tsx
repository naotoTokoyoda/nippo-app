'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import SaveConfirmModal from './SaveConfirmModal';
import { useToast } from './ToastProvider';
import AggregationHeader from './aggregation/aggregation-header';
import AggregationActions from './aggregation/aggregation-actions';
import AggregationBillingPanel from './aggregation/aggregation-billing-panel';
import AggregationCostPanel from './aggregation/aggregation-cost-panel';
import AggregationAdjustmentHistory from './aggregation/aggregation-adjustment-history';
import AggregationWorkerHistory from './aggregation/aggregation-worker-history';
import { useAggregationData } from '@/hooks/useAggregationData';
import { useAggregationSave } from '@/hooks/useAggregationSave';
import { useAggregationStore } from '@/stores/aggregationStore';
import { EXPENSE_CATEGORY_OPTIONS } from '@/lib/aggregation/expense-utils';

interface AggregationDetailProps {
  workOrderId: string;
}

export default function AggregationDetail({ workOrderId }: AggregationDetailProps) {
  const router = useRouter();
  const { showToast } = useToast();

  // データ取得のカスタムフック
  const { workOrder, loading, isAuthenticated, refetch } = useAggregationData(workOrderId);

  // Zustandストアから状態とアクションを取得
  const isEditing = useAggregationStore((state) => state.isEditing);
  const setWorkOrder = useAggregationStore((state) => state.setWorkOrder);
  const startEditing = useAggregationStore((state) => state.startEditing);
  const cancelEditing = useAggregationStore((state) => state.cancelEditing);
  const getExpensesHasChanges = useAggregationStore((state) => state.getExpensesHasChanges);
  const getRateChanges = useAggregationStore((state) => state.getRateChanges);
  const getSanitizedExpenses = useAggregationStore((state) => state.getSanitizedExpenses);
  const getAdjustmentsForAPI = useAggregationStore((state) => state.getAdjustmentsForAPI);

  // workOrderが変更されたらストアに反映
  useEffect(() => {
    setWorkOrder(workOrder);
  }, [workOrder, setWorkOrder]);

  // 保存・API通信のカスタムフック
  const saveManager = useAggregationSave({
    workOrderId,
    onSaveSuccess: async () => {
      cancelEditing();
      await refetch();
    },
    onShowToast: showToast,
  });

  const formatCurrency = useCallback((amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '¥0';
    return `¥${amount.toLocaleString()}`;
  }, []);
  const formatHours = useCallback((hours: number | undefined | null) => {
    if (hours === undefined || hours === null) return '0.00時間';
    return `${hours.toFixed(2)}時間`;
  }, []);

  const handleEditStart = useCallback(() => {
    if (!workOrder) {
      return;
    }
    startEditing();
    saveManager.clearPendingData();
  }, [workOrder, startEditing, saveManager]);

  const handleEditCancel = useCallback(() => {
    cancelEditing();
    saveManager.clearPendingData();
  }, [cancelEditing, saveManager]);

  const calculateChanges = useCallback(() => {
    const rateChanges = getRateChanges();
    const sanitizedExpenses = getSanitizedExpenses();
    const expensesChanged = getExpensesHasChanges();

    return { rateChanges, expensesChanged, sanitizedExpenses };
  }, [getRateChanges, getSanitizedExpenses, getExpensesHasChanges]);

  const handleSaveClick = useCallback(() => {
    const { rateChanges, expensesChanged, sanitizedExpenses } = calculateChanges();
    const hasAnyChanges = rateChanges.length > 0 || expensesChanged;

    if (!hasAnyChanges) {
      alert('変更がありません。');
      return;
    }
    saveManager.openSaveConfirm(rateChanges, sanitizedExpenses);
  }, [calculateChanges, saveManager]);

  const handleSaveConfirm = useCallback(async () => {
    const adjustmentsForAPI = getAdjustmentsForAPI();
    const expensePayload = getSanitizedExpenses();

    await saveManager.saveChanges({
      adjustmentsForAPI,
      expensePayload,
    });
  }, [getAdjustmentsForAPI, getSanitizedExpenses, saveManager]);

  const handleStatusChange = useCallback(async (newStatus: 'aggregating' | 'aggregated' | 'delivered') => {
    try {
      // 「完了」に変更する場合は確認ダイアログを表示
      if (newStatus === 'aggregated') {
        if (!confirm('集計を完了しますか？完了後は編集できなくなります。')) {
          // キャンセルされた場合は元の値に戻す必要があるので、refetchして表示を更新
          await refetch();
          return;
        }
      }

      const response = await fetch(`/api/aggregation/${workOrderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'ステータス変更に失敗しました';
        const errorDetails = errorData.details ? `\n詳細: ${errorData.details}` : '';
        throw new Error(`${errorMessage}${errorDetails}`);
      }

      // 完了に変更した場合は集計一覧にリダイレクト
      if (newStatus === 'aggregated') {
        showToast('集計が完了されました', 'success');
        router.push('/aggregation');
      } else {
        showToast('ステータスを変更しました', 'success');
        await refetch();
      }
    } catch (error) {
      console.error('Status change error:', error);
      const message = error instanceof Error ? error.message : 'ステータス変更に失敗しました';
      showToast(message, 'error');
      // エラーが発生した場合も表示を更新
      await refetch();
    }
  }, [workOrderId, showToast, refetch, router]);

  if (!isAuthenticated || loading) {
    return (
      <PageLayout title="集計詳細">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">認証を確認しています...</span>
        </div>
      </PageLayout>
    );
  }

  if (!workOrder) {
    return (
      <PageLayout title="集計詳細">
        <div className="text-center py-12">
          <div className="text-gray-500">集計データが見つかりません</div>
          <Link href="/aggregation" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
            集計一覧に戻る
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={"集計詳細"}>
      <div className="space-y-6">
        <AggregationHeader workOrder={workOrder} formatHours={formatHours} onStatusChange={handleStatusChange} />
        <AggregationActions
          status={workOrder.status}
          isEditing={isEditing}
          isSaving={saveManager.isSaving}
          onEditStart={handleEditStart}
          onCancelEdit={handleEditCancel}
          onSaveClick={handleSaveClick}
          onFinalize={saveManager.finalizeAggregation}
        />
        <div className="grid grid-cols-1 gap-6">
          <AggregationCostPanel
            categoryOptions={EXPENSE_CATEGORY_OPTIONS}
            formatCurrency={formatCurrency}
            formatHours={formatHours}
          />
          <AggregationBillingPanel
            categoryOptions={EXPENSE_CATEGORY_OPTIONS}
            formatCurrency={formatCurrency}
            formatHours={formatHours}
          />
        </div>
        <AggregationWorkerHistory 
          workNumberFront={workOrder.workNumber.split('-')[0]} 
          workNumberBack={workOrder.workNumber.split('-')[1]} 
        />
        <AggregationAdjustmentHistory adjustments={workOrder.adjustments} formatCurrency={formatCurrency} />
      </div>

      <SaveConfirmModal
        isOpen={saveManager.showSaveConfirm}
        onClose={saveManager.closeSaveConfirm}
        onConfirm={handleSaveConfirm}
        rateChanges={saveManager.pendingRateChanges}
        expenses={saveManager.pendingExpenseSnapshot}
      />
    </PageLayout>
  );
}
