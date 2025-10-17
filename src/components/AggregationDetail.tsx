'use client';

import { useState, useCallback, useMemo } from 'react';
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
import { useExpenseEditor } from '@/hooks/useExpenseEditor';
import { useRateEditor } from '@/hooks/useRateEditor';
import { useAggregationData } from '@/hooks/useAggregationData';
import { useAggregationSave } from '@/hooks/useAggregationSave';
import { EXPENSE_CATEGORY_OPTIONS } from '@/lib/aggregation/expense-utils';
import { ExpenseItem } from '@/types/aggregation';

interface AggregationDetailProps {
  workOrderId: string;
}

export default function AggregationDetail({ workOrderId }: AggregationDetailProps) {
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  // データ取得のカスタムフック
  const { workOrder, loading, isAuthenticated, refetch } = useAggregationData(workOrderId);

  // 経費編集のカスタムフック
  const expenseEditor = useExpenseEditor(workOrder?.expenses || []);
  
  // 単価編集のカスタムフック
  const rateEditor = useRateEditor(workOrder?.activities || []);

  // 保存・API通信のカスタムフック
  const saveManager = useAggregationSave({
    workOrderId,
    onSaveSuccess: async () => {
      setIsEditing(false);
      rateEditor.cancelEditing();
      expenseEditor.cancelEditing();
      await refetch();
    },
    onShowToast: showToast,
  });

  const formatCurrency = useCallback((amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '¥0';
    return `¥${amount.toLocaleString()}`;
  }, []);
  const formatHours = useCallback((hours: number | undefined | null) => {
    if (hours === undefined || hours === null) return '0.0h';
    return `${hours.toFixed(1)}h`;
  }, []);

  const expensesForDisplay = useMemo(() => {
    if (!workOrder) {
      return [] as ExpenseItem[];
    }
    return isEditing ? expenseEditor.editedExpenses : workOrder.expenses;
  }, [expenseEditor.editedExpenses, isEditing, workOrder]);

  const activitiesForDisplay = useMemo(() => {
    if (!workOrder) {
      return [];
    }
    return isEditing ? rateEditor.activitiesForDisplay : workOrder.activities;
  }, [workOrder, isEditing, rateEditor.activitiesForDisplay]);

  const costExpenseSubtotal = useMemo(
    () => expensesForDisplay.reduce((sum, expense) => sum + expense.costTotal, 0),
    [expensesForDisplay],
  );

  const billExpenseSubtotal = useMemo(
    () => expensesForDisplay.reduce((sum, expense) => sum + expense.billTotal, 0),
    [expensesForDisplay],
  );

  const costLaborSubtotal = useMemo(() => {
    if (!workOrder) {
      return 0;
    }
    return workOrder.activities.reduce((sum, activity) => sum + activity.costAmount, 0);
  }, [workOrder]);

  const totals = useMemo(
    () => ({
      costLaborTotal: costLaborSubtotal,
      billLaborTotal: rateEditor.billLaborSubtotal,
      adjustmentTotal: rateEditor.adjustmentTotal,
      finalAmount: rateEditor.billLaborSubtotal + billExpenseSubtotal,
    }),
    [rateEditor.adjustmentTotal, billExpenseSubtotal, rateEditor.billLaborSubtotal, costLaborSubtotal],
  );

  const costGrandTotal = useMemo(
    () => costLaborSubtotal + costExpenseSubtotal,
    [costExpenseSubtotal, costLaborSubtotal],
  );

  const billGrandTotal = useMemo(
    () => rateEditor.billLaborSubtotal + billExpenseSubtotal,
    [billExpenseSubtotal, rateEditor.billLaborSubtotal],
  );

  const handleEditStart = useCallback(() => {
    if (!workOrder) {
      return;
    }

    rateEditor.startEditing(workOrder.activities);
    expenseEditor.startEditing(workOrder.expenses);
    saveManager.clearPendingData();
    setIsEditing(true);
  }, [workOrder, rateEditor, expenseEditor, saveManager]);

  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
    rateEditor.cancelEditing();
    expenseEditor.cancelEditing();
    saveManager.clearPendingData();
  }, [rateEditor, expenseEditor, saveManager]);

  const calculateChanges = useCallback(() => {
    const rateChanges = rateEditor.rateChanges;
    const sanitizedExpenses = expenseEditor.sanitizedExpenses;
    const expensesChanged = expenseEditor.hasChanges;

    return { rateChanges, expensesChanged, sanitizedExpenses };
  }, [rateEditor.rateChanges, expenseEditor.sanitizedExpenses, expenseEditor.hasChanges]);

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
    const adjustmentsForAPI = rateEditor.getAdjustmentsForAPI();
    const expensePayload = expenseEditor.sanitizedExpenses;

    await saveManager.saveChanges({
      adjustmentsForAPI,
      expensePayload,
    });
  }, [rateEditor, expenseEditor, saveManager]);

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
        <AggregationHeader workOrder={workOrder} formatHours={formatHours} />
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
            activities={activitiesForDisplay}
            expenses={expensesForDisplay}
            isEditing={isEditing}
            categoryOptions={EXPENSE_CATEGORY_OPTIONS}
            onExpenseAdd={expenseEditor.addExpense}
            onExpenseCategoryChange={expenseEditor.changeCategoryAt}
            onExpenseCostChange={expenseEditor.changeCostFieldAt}
            onExpenseRemove={expenseEditor.removeExpense}
            onFileEstimateChange={expenseEditor.changeFileEstimateAt}
            onActivityMemoChange={(activity, memo) => rateEditor.editRate(activity, 'memo', memo)}
            editedRates={rateEditor.editedRates}
            costLaborSubtotal={totals.costLaborTotal}
            expenseSubtotal={costExpenseSubtotal}
            costTotal={costGrandTotal}
            formatCurrency={formatCurrency}
            formatHours={formatHours}
          />
          <AggregationBillingPanel
            activities={activitiesForDisplay}
            expenses={expensesForDisplay}
            isEditing={isEditing}
            categoryOptions={EXPENSE_CATEGORY_OPTIONS}
            editedRates={rateEditor.editedRates}
            activityBillAmounts={rateEditor.activityBillAmounts}
            billLaborSubtotal={totals.billLaborTotal}
            expenseSubtotal={billExpenseSubtotal}
            billTotal={billGrandTotal}
            onRateEdit={rateEditor.editRate}
            onExpenseBillingChange={expenseEditor.changeBillingFieldAt}
            onExpenseBillingReset={expenseEditor.resetBillingAt}
            onFileEstimateChange={expenseEditor.changeFileEstimateAt}
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
