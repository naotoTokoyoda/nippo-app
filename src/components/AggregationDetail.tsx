'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useExpenseEditor } from '@/hooks/useExpenseEditor';
import { EXPENSE_CATEGORY_OPTIONS } from '@/lib/aggregation/expense-utils';
import {
  ActivityBillAmountMap,
  EditedRates,
  ExpenseItem,
  WorkOrderDetail,
} from '@/types/aggregation';
type RateChange = {
  activity: string;
  activityName: string;
  oldRate: number;
  newRate: number;
  memo: string;
  hours: number;
  adjustment: number;
};

interface AggregationDetailProps {
  workOrderId: string;
}

export default function AggregationDetail({ workOrderId }: AggregationDetailProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [workOrder, setWorkOrder] = useState<WorkOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedRates, setEditedRates] = useState<EditedRates>({});
  const [pendingRateChanges, setPendingRateChanges] = useState<RateChange[]>([]);
  const [pendingExpenseSnapshot, setPendingExpenseSnapshot] = useState<ExpenseItem[]>([]);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 経費編集のカスタムフック
  const expenseEditor = useExpenseEditor(workOrder?.expenses || []);

  const fetchWorkOrderDetail = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/aggregation/${workOrderId}`);
      if (!response.ok) {
        throw new Error('データの取得に失敗しました');
      }

      const data = await response.json();
      setWorkOrder(data);
    } catch (error) {
      console.error('集計詳細取得エラー:', error);
      alert('データの取得に失敗しました。再度お試しください。');
    } finally {
      setLoading(false);
    }
  }, [workOrderId]);

  const checkAuthentication = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/aggregation');
      const data = await response.json();

      if (!data.authenticated) {
        router.replace('/');
        return;
      }

      setIsAuthenticated(true);
    } catch (error) {
      console.error('認証チェックエラー:', error);
      router.replace('/');
    }
  }, [router]);

  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWorkOrderDetail();
    }
  }, [fetchWorkOrderDetail, isAuthenticated]);

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
    return workOrder.activities.map(activity => ({
      ...activity,
      memo: editedRates[activity.activity]?.memo ?? activity.memo,
    }));
  }, [workOrder, editedRates]);

  const activityBillAmounts = useMemo<ActivityBillAmountMap>(() => {
    if (!workOrder) {
      return {};
    }

    return workOrder.activities.reduce<ActivityBillAmountMap>((acc, activity) => {
      const editedRate = editedRates[activity.activity];
      const currentBillRate = editedRate ? parseInt(editedRate.billRate, 10) || activity.billRate : activity.billRate;
      const currentBillAmount = activity.hours * currentBillRate;
      acc[activity.activity] = {
        currentBillRate,
        currentBillAmount,
      };
      return acc;
    }, {});
  }, [editedRates, workOrder]);

  const billLaborSubtotal = useMemo(
    () => Object.values(activityBillAmounts).reduce((sum, info) => sum + info.currentBillAmount, 0),
    [activityBillAmounts],
  );

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

  const adjustmentTotal = useMemo(() => {
    if (!workOrder) {
      return 0;
    }

    return workOrder.activities.reduce((sum, activity) => {
      const editedRate = editedRates[activity.activity];

      if (editedRate) {
        const currentBillRate = parseInt(editedRate.billRate, 10) || 0;
        const originalBillRate = activity.billRate;
        const originalAmount = activity.hours * originalBillRate;
        const newAmount = activity.hours * currentBillRate;
        return sum + (newAmount - originalAmount);
      }

      return sum + activity.adjustment;
    }, 0);
  }, [editedRates, workOrder]);

  const totals = useMemo(
    () => ({
      costLaborTotal: costLaborSubtotal,
      billLaborTotal: billLaborSubtotal,
      adjustmentTotal,
      finalAmount: billLaborSubtotal + billExpenseSubtotal,
    }),
    [adjustmentTotal, billExpenseSubtotal, billLaborSubtotal, costLaborSubtotal],
  );

  const costGrandTotal = useMemo(
    () => costLaborSubtotal + costExpenseSubtotal,
    [costExpenseSubtotal, costLaborSubtotal],
  );

  const billGrandTotal = useMemo(
    () => billLaborSubtotal + billExpenseSubtotal,
    [billExpenseSubtotal, billLaborSubtotal],
  );

  const handleRateEdit = useCallback(
    (activity: string, field: 'billRate' | 'memo', value: string) => {
      setEditedRates((prev) => ({
        ...prev,
        [activity]: {
          ...prev[activity],
          [field]: value,
        },
      }));
    },
    [],
  );

  const handleEditStart = useCallback(() => {
    if (!workOrder) {
      return;
    }

    const initialRates: EditedRates = {};
    workOrder.activities.forEach((activity) => {
      initialRates[activity.activity] = {
        billRate: activity.billRate.toString(),
        memo: activity.memo ?? '',
      };
    });

    setEditedRates(initialRates);
    expenseEditor.startEditing(workOrder.expenses);
    setPendingRateChanges([]);
    setPendingExpenseSnapshot([]);
    setIsEditing(true);
  }, [workOrder, expenseEditor]);

  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
    setEditedRates({});
    expenseEditor.cancelEditing();
    setPendingRateChanges([]);
    setPendingExpenseSnapshot([]);
  }, [expenseEditor]);

  const calculateChanges = useCallback(() => {
    if (!workOrder) {
      return {
        rateChanges: [] as RateChange[],
        expensesChanged: false,
        sanitizedExpenses: [] as ExpenseItem[],
      };
    }

    const rateChanges = Object.entries(editedRates)
      .map(([activity, data]) => {
        const activityData = workOrder.activities.find((a) => a.activity === activity);
        if (!activityData) {
          return null;
        }

        const oldRate = activityData.billRate;
        const newRate = parseInt(data.billRate, 10) || 0;
        const adjustment = (newRate - oldRate) * activityData.hours;

        return {
          activity,
          activityName: activityData.activityName,
          oldRate,
          newRate,
          memo: data.memo || '',
          hours: activityData.hours,
          adjustment,
        };
      })
      .filter(Boolean) as RateChange[];

    const sanitizedExpenses = expenseEditor.sanitizedExpenses;
    const expensesChanged = expenseEditor.hasChanges;

    return { rateChanges, expensesChanged, sanitizedExpenses };
  }, [editedRates, workOrder, expenseEditor.sanitizedExpenses, expenseEditor.hasChanges]);

  const handleSaveClick = useCallback(() => {
    const { rateChanges, expensesChanged, sanitizedExpenses } = calculateChanges();
    const hasAnyChanges = rateChanges.length > 0 || expensesChanged;

    if (!hasAnyChanges) {
      alert('変更がありません。');
      return;
    }
    setPendingRateChanges(rateChanges);
    setPendingExpenseSnapshot(sanitizedExpenses);
    setShowSaveConfirm(true);
  }, [calculateChanges]);

  const handleSaveConfirm = useCallback(async () => {
    try {
      setIsSaving(true);

      const adjustmentsForAPI: Record<string, { billRate: number; memo: string }> = {};
      
      // editedRatesがある場合は送信
      Object.entries(editedRates).forEach(([activity, data]) => {
        // メモのみの変更でも送信するため、billRateは元の値を保持
        const originalBillRate = workOrder?.activities.find(a => a.activity === activity)?.billRate || 0;
        adjustmentsForAPI[activity] = {
          billRate: parseInt(data.billRate, 10) || originalBillRate,
          memo: data.memo || '',
        };
      });
      
      // editedRatesが空でも、activitiesForDisplayでメモが変更されている場合は送信
      if (Object.keys(adjustmentsForAPI).length === 0 && workOrder) {
        workOrder.activities.forEach(activity => {
          const editedActivity = activitiesForDisplay.find(a => a.activity === activity.activity);
          if (editedActivity && editedActivity.memo !== activity.memo) {
            adjustmentsForAPI[activity.activity] = {
              billRate: activity.billRate,
              memo: editedActivity.memo || '',
            };
          }
        });
      }

      const expensePayload = expenseEditor.sanitizedExpenses;

      const response = await fetch(`/api/aggregation/${workOrderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billRateAdjustments: adjustmentsForAPI,
          expenses: expensePayload,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存に失敗しました');
      }

      setShowSaveConfirm(false);
      setIsEditing(false);
      setEditedRates({});
      expenseEditor.cancelEditing();
      setPendingRateChanges([]);
      setPendingExpenseSnapshot([]);

      await fetchWorkOrderDetail();

      showToast('単価の更新が保存されました', 'success');
    } catch (error) {
      console.error('保存エラー:', error);
      showToast(error instanceof Error ? error.message : '保存中にエラーが発生しました', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [editedRates, fetchWorkOrderDetail, expenseEditor, showToast, workOrderId, workOrder, activitiesForDisplay]);

  const handleFinalize = useCallback(async () => {
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

      showToast('集計が完了されました', 'success');
      router.push('/aggregation');
    } catch (error) {
      console.error('完了エラー:', error);
      showToast(error instanceof Error ? error.message : '完了処理中にエラーが発生しました', 'error');
    }
  }, [router, showToast, workOrderId]);

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
          isSaving={isSaving}
          onEditStart={handleEditStart}
          onCancelEdit={handleEditCancel}
          onSaveClick={handleSaveClick}
          onFinalize={handleFinalize}
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
            onActivityMemoChange={(activity, memo) => handleRateEdit(activity, 'memo', memo)}
            editedRates={editedRates}
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
            editedRates={editedRates}
            activityBillAmounts={activityBillAmounts}
            billLaborSubtotal={totals.billLaborTotal}
            expenseSubtotal={billExpenseSubtotal}
            billTotal={billGrandTotal}
            onRateEdit={handleRateEdit}
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
        isOpen={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        onConfirm={handleSaveConfirm}
        rateChanges={pendingRateChanges}
        expenses={pendingExpenseSnapshot}
      />
    </PageLayout>
  );
}
