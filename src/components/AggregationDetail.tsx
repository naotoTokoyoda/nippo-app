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
import AggregationAdjustmentMemo from './aggregation/aggregation-adjustment-memo';
import AggregationAdjustmentHistory from './aggregation/aggregation-adjustment-history';
import {
  ActivityBillAmountMap,
  EditedRates,
  Material,
  WorkOrderDetail,
} from '@/types/aggregation';

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
  const [editedMaterials, setEditedMaterials] = useState<Material[]>([]);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const formatCurrency = useCallback((amount: number) => `¥${amount.toLocaleString()}`, []);
  const formatHours = useCallback((hours: number) => `${hours.toFixed(1)}h`, []);

  const materialsForDisplay = useMemo(() => {
    if (!workOrder) {
      return [] as Material[];
    }
    return isEditing ? editedMaterials : workOrder.materials;
  }, [editedMaterials, isEditing, workOrder]);

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

  const materialSubtotal = useMemo(
    () => materialsForDisplay.reduce((sum, material) => sum + material.totalAmount, 0),
    [materialsForDisplay],
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
      finalAmount: billLaborSubtotal + materialSubtotal,
    }),
    [adjustmentTotal, billLaborSubtotal, costLaborSubtotal, materialSubtotal],
  );

  const costGrandTotal = useMemo(
    () => costLaborSubtotal + materialSubtotal,
    [costLaborSubtotal, materialSubtotal],
  );

  const billGrandTotal = useMemo(
    () => billLaborSubtotal + materialSubtotal,
    [billLaborSubtotal, materialSubtotal],
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

  const handleMaterialAdd = useCallback(() => {
    const newMaterial: Material = {
      id: `temp-${Date.now()}`,
      name: '',
      unitPrice: 0,
      quantity: 1,
      totalAmount: 0,
    };
    setEditedMaterials((prev) => [...prev, newMaterial]);
  }, []);

  const handleMaterialUpdate = useCallback(
    (index: number, field: keyof Material, value: string | number) => {
      setEditedMaterials((prev) => {
        const updated = [...prev];
        const target = updated[index];
        if (!target) {
          return prev;
        }

        if (field === 'unitPrice' || field === 'quantity') {
          const numericValue = typeof value === 'string' ? parseInt(value, 10) || (field === 'quantity' ? 1 : 0) : value;
          updated[index] = { ...target, [field]: numericValue };
          const unitPrice = field === 'unitPrice' ? numericValue : updated[index].unitPrice;
          const quantity = field === 'quantity' ? numericValue : updated[index].quantity;
          updated[index].totalAmount = unitPrice * quantity;
        } else {
          updated[index] = { ...target, [field]: value };
        }

        return updated;
      });
    },
    [],
  );

  const handleMaterialRemove = useCallback((index: number) => {
    setEditedMaterials((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleEditStart = useCallback(() => {
    if (!workOrder) {
      return;
    }

    const initialRates: EditedRates = {};
    workOrder.activities.forEach((activity) => {
      initialRates[activity.activity] = {
        billRate: activity.billRate.toString(),
        memo: '',
      };
    });

    setEditedRates(initialRates);
    setEditedMaterials(workOrder.materials.map((material) => ({ ...material })));
    setIsEditing(true);
  }, [workOrder]);

  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
    setEditedRates({});
    setEditedMaterials([]);
  }, []);

  const calculateChanges = useCallback(() => {
    if (!workOrder) {
      return [] as Array<{
        activity: string;
        activityName: string;
        oldRate: number;
        newRate: number;
        memo: string;
        hours: number;
        adjustment: number;
      }>;
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
      .filter(Boolean) as Array<{
        activity: string;
        activityName: string;
        oldRate: number;
        newRate: number;
        memo: string;
        hours: number;
        adjustment: number;
      }>;

    const hasMaterialChanges = () => {
      if (!workOrder) {
        return false;
      }

      const validEditedMaterials = editedMaterials.filter((material) => material.name.trim() !== '');

      if (validEditedMaterials.length !== workOrder.materials.length) {
        return true;
      }

      return validEditedMaterials.some((editedMaterial, index) => {
        const originalMaterial = workOrder.materials[index];
        return (
          !originalMaterial ||
          editedMaterial.name !== originalMaterial.name ||
          editedMaterial.unitPrice !== originalMaterial.unitPrice ||
          editedMaterial.quantity !== originalMaterial.quantity ||
          editedMaterial.totalAmount !== originalMaterial.totalAmount
        );
      });
    };

    const materialChangesExist = hasMaterialChanges();

    if (materialChangesExist && rateChanges.length === 0) {
      return [
        {
          activity: 'materials',
          activityName: '材料費変更',
          oldRate: 0,
          newRate: 0,
          memo: '材料費の変更',
          hours: 0,
          adjustment: 0,
        },
      ];
    }

    return rateChanges.length > 0 || materialChangesExist ? rateChanges : [];
  }, [editedMaterials, editedRates, workOrder]);

  const handleSaveClick = useCallback(() => {
    const changes = calculateChanges();
    const hasAnyChanges = changes.length > 0;

    if (!hasAnyChanges) {
      alert('変更がありません。');
      return;
    }
    setShowSaveConfirm(true);
  }, [calculateChanges]);

  const handleSaveConfirm = useCallback(async () => {
    try {
      setIsSaving(true);

      const adjustmentsForAPI: Record<string, { billRate: number; memo: string }> = {};
      Object.entries(editedRates).forEach(([activity, data]) => {
        adjustmentsForAPI[activity] = {
          billRate: parseInt(data.billRate, 10) || 0,
          memo: data.memo || '',
        };
      });

      const response = await fetch(`/api/aggregation/${workOrderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billRateAdjustments: adjustmentsForAPI,
          materials: editedMaterials,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存に失敗しました');
      }

      setShowSaveConfirm(false);
      setIsEditing(false);
      setEditedRates({});
      setEditedMaterials([]);

      await fetchWorkOrderDetail();

      showToast('単価の更新が保存されました', 'success');
    } catch (error) {
      console.error('保存エラー:', error);
      showToast(error instanceof Error ? error.message : '保存中にエラーが発生しました', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [editedMaterials, editedRates, fetchWorkOrderDetail, showToast, workOrderId]);

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

  const pendingChanges = useMemo(() => calculateChanges(), [calculateChanges]);

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
    <PageLayout title={`集計詳細 - ${workOrder.workNumber}`}>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AggregationBillingPanel
            activities={workOrder.activities}
            materials={materialsForDisplay}
            editedMaterials={editedMaterials}
            isEditing={isEditing}
            editedRates={editedRates}
            activityBillAmounts={activityBillAmounts}
            billLaborSubtotal={totals.billLaborTotal}
            materialSubtotal={materialSubtotal}
            billTotal={billGrandTotal}
            onRateEdit={handleRateEdit}
            onMaterialAdd={handleMaterialAdd}
            onMaterialUpdate={handleMaterialUpdate}
            onMaterialRemove={handleMaterialRemove}
            formatCurrency={formatCurrency}
            formatHours={formatHours}
          />
          <AggregationCostPanel
            activities={workOrder.activities}
            materials={materialsForDisplay}
            costLaborSubtotal={totals.costLaborTotal}
            materialSubtotal={materialSubtotal}
            costTotal={costGrandTotal}
            formatCurrency={formatCurrency}
            formatHours={formatHours}
          />
        </div>
        {isEditing && (
          <AggregationAdjustmentMemo
            activities={workOrder.activities}
            editedRates={editedRates}
            onRateEdit={handleRateEdit}
          />
        )}
        <AggregationAdjustmentHistory adjustments={workOrder.adjustments} formatCurrency={formatCurrency} />
      </div>

      <SaveConfirmModal
        isOpen={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        onConfirm={handleSaveConfirm}
        changes={pendingChanges}
        materials={editedMaterials.filter((material) => material.name.trim() !== '')}
      />
    </PageLayout>
  );
}
