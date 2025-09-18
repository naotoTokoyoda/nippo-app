'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import SaveConfirmModal from './SaveConfirmModal';
import { useToast } from './ToastProvider';

// 型定義
interface ActivitySummary {
  activity: string;
  activityName: string;
  hours: number;
  costRate: number;
  billRate: number;
  costAmount: number;
  billAmount: number;
  adjustment: number;
}

interface Material {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  totalAmount: number;
}

interface WorkOrderDetail {
  id: string;
  workNumber: string;
  customerName: string;
  projectName: string;
  term: string;
  status: 'aggregating' | 'aggregated';
  totalHours: number;
  activities: ActivitySummary[];
  materials: Material[];
  adjustments: Array<{
    id: string;
    type: string;
    amount: number;
    reason: string;
    memo?: string;
    createdAt: string;
    createdBy: string;
  }>;
}

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
  const [editedRates, setEditedRates] = useState<Record<string, { billRate: string; memo: string }>>({});
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // APIからデータを取得
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

  // 認証状態をチェック
  const checkAuthentication = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/aggregation');
      const data = await response.json();
      
      if (!data.authenticated) {
        // 認証されていない場合はホームに戻る
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

  const calculateTotals = () => {
    if (!workOrder) return { costTotal: 0, billTotal: 0, adjustmentTotal: 0, finalAmount: 0 };

    const costTotal = workOrder.activities.reduce((sum, activity) => sum + activity.costAmount, 0);
    
    // 請求小計：編集された単価を使用してリアルタイム計算
    const billTotal = workOrder.activities.reduce((sum, activity) => {
      const editedRate = editedRates[activity.activity];
      const currentBillRate = editedRate ? parseInt(editedRate.billRate) || activity.billRate : activity.billRate;
      return sum + (activity.hours * currentBillRate);
    }, 0);
    
    // 調整額：APIから返された値＋編集中の調整額を計算
    const adjustmentTotal = workOrder.activities.reduce((sum, activity) => {
      const editedRate = editedRates[activity.activity];
      
      // 編集中の場合は差額を計算
      if (editedRate) {
        const currentBillRate = parseInt(editedRate.billRate) || 0;
        const originalBillRate = activity.billRate;
        const originalAmount = activity.hours * originalBillRate;
        const newAmount = activity.hours * currentBillRate;
        const editingAdjustment = newAmount - originalAmount;
        return sum + editingAdjustment;
      }
      
      // 編集されていない場合はAPIから返された調整額を使用
      return sum + activity.adjustment;
    }, 0);
    
    const finalAmount = billTotal;

    return { costTotal, billTotal, adjustmentTotal, finalAmount };
  };

  const handleRateEdit = (activity: string, field: 'billRate' | 'memo', value: string) => {
    setEditedRates(prev => ({
      ...prev,
      [activity]: {
        ...prev[activity],
        [field]: value,
      }
    }));
  };

  // 変更内容を計算する関数
  const calculateChanges = () => {
    if (!workOrder) return [];
    
    return Object.entries(editedRates).map(([activity, data]) => {
      const activityData = workOrder.activities.find(a => a.activity === activity);
      if (!activityData) return null;
      
      const oldRate = activityData.billRate;
      const newRate = parseInt(data.billRate) || 0;
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
    }).filter(Boolean) as Array<{
      activity: string;
      activityName: string;
      oldRate: number;
      newRate: number;
      memo: string;
      hours: number;
      adjustment: number;
    }>;
  };

  // 保存ボタンクリック時（確認モーダルを表示）
  const handleSaveClick = () => {
    const changes = calculateChanges();
    if (changes.length === 0) {
      alert('変更がありません。');
      return;
    }
    setShowSaveConfirm(true);
  };

  // 実際の保存処理
  const handleSaveConfirm = async () => {
    try {
      setIsSaving(true);
      
      // 文字列を数値に変換してAPIに送信
      const adjustmentsForAPI: Record<string, { billRate: number; memo: string }> = {};
      Object.entries(editedRates).forEach(([activity, data]) => {
        adjustmentsForAPI[activity] = {
          billRate: parseInt(data.billRate) || 0,
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
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存に失敗しました');
      }

      // 確認モーダルを閉じる
      setShowSaveConfirm(false);
      
      // 編集状態をリセット
      setIsEditing(false);
      setEditedRates({});
      
      // データを再取得して最新状態を表示
      await fetchWorkOrderDetail();
      
      // 成功トーストを表示
      showToast('単価の更新が保存されました', 'success');
      
    } catch (error) {
      console.error('保存エラー:', error);
      showToast(error instanceof Error ? error.message : '保存中にエラーが発生しました', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (confirm('集計を完了しますか？完了後は編集できなくなります。')) {
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
    }
  };

  const handleExportCSV = () => {
    // TODO: CSV出力実装
    alert('CSV出力機能は Phase 2 で実装予定です');
  };

  const handleExportPDF = () => {
    // TODO: PDF出力実装
    alert('PDF出力機能は Phase 2 で実装予定です');
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`;
  };

  // 認証チェック中または未認証の場合
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

  const totals = calculateTotals();

  return (
    <PageLayout title={`集計詳細 - ${workOrder.workNumber}`}>
      <div className="space-y-6">
        {/* ヘッダー情報 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">工番</label>
              <div className="text-lg font-semibold">{workOrder.workNumber}</div>
              <div className="text-sm text-gray-500">{workOrder.term}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">顧客</label>
              <div className="text-lg font-semibold">{workOrder.customerName}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">案件名</label>
              <div className="text-lg font-semibold">{workOrder.projectName}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">総時間</label>
              <div className="text-lg font-semibold">{formatHours(workOrder.totalHours)}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">ステータス</label>
              <div className="flex items-center">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  workOrder.status === 'aggregating' 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {workOrder.status === 'aggregating' ? '集計中' : '完了'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex flex-wrap gap-4 justify-between items-center">
          <Link href="/aggregation">
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              ← 集計一覧に戻る
            </button>
          </Link>
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              CSV出力
            </button>
            <button
              onClick={handleExportPDF}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              PDF出力
            </button>
            {workOrder.status === 'aggregating' && (
              <>
                {!isEditing ? (
                  <button
                    onClick={() => {
                      // 編集開始時に現在の値で初期化
                      const initialRates: Record<string, { billRate: string; memo: string }> = {};
                      workOrder.activities.forEach(activity => {
                        initialRates[activity.activity] = {
                          billRate: activity.billRate.toString(),
                          memo: ''
                        };
                      });
                      setEditedRates(initialRates);
                      setIsEditing(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    編集
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditedRates({});
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      キャンセル
                    </button>
                                      <button
                    onClick={handleSaveClick}
                    disabled={isSaving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 flex items-center"
                  >
                    {isSaving && (
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {isSaving ? '保存中...' : '保存'}
                  </button>
                  </>
                )}
                <button
                  onClick={handleFinalize}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                >
                  完了
                </button>
              </>
            )}
          </div>
        </div>

        {/* 左右並べ表示（実際請求 | 原価合計） */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左側: 実際請求 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-blue-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-blue-900">実際請求</h3>
              <p className="text-sm text-blue-600">編集可能な請求単価で計算</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      区分
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      時間
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      単価
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      小計
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {workOrder.activities.map((activity) => (
                    <tr key={activity.activity}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {activity.activityName}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatHours(activity.hours)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editedRates[activity.activity]?.billRate ?? activity.billRate.toString()}
                            onChange={(e) => handleRateEdit(activity.activity, 'billRate', e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-right text-sm"
                            min="0"
                            step="1000"
                          />
                        ) : (
                          formatCurrency(activity.billRate)
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                        {(() => {
                          const editedRate = editedRates[activity.activity];
                          const currentBillRate = editedRate ? parseInt(editedRate.billRate) || activity.billRate : activity.billRate;
                          const currentBillAmount = activity.hours * currentBillRate;
                          return formatCurrency(currentBillAmount);
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* 材料費セクション */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700">材料費</h4>
                {isEditing && (
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    + 追加
                  </button>
                )}
              </div>
              {workOrder.materials.length > 0 ? (
                <div className="space-y-2">
                  {workOrder.materials.map((material) => (
                    <div key={material.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{material.name}</div>
                        <div className="text-xs text-gray-500">
                          {formatCurrency(material.unitPrice)} × {material.quantity}個
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(material.totalAmount)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  材料費はありません
                </div>
              )}
            </div>
            {/* 請求側合計 */}
            <div className="border-t border-gray-200 bg-blue-50 p-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">労務費小計</span>
                  <span className="text-sm font-medium">{formatCurrency(totals.billTotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">材料費小計</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(workOrder.materials.reduce((sum, m) => sum + m.totalAmount, 0))}
                  </span>
                </div>
                <div className="border-t border-blue-200 pt-2 flex justify-between items-center">
                  <span className="font-semibold text-blue-900">請求合計</span>
                  <span className="text-lg font-bold text-blue-900">
                    {formatCurrency(totals.billTotal + workOrder.materials.reduce((sum, m) => sum + m.totalAmount, 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 右側: 原価合計 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">原価合計</h3>
              <p className="text-sm text-gray-600">固定の原価単価で計算</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      区分
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      時間
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      単価
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      小計
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {workOrder.activities.map((activity) => (
                    <tr key={activity.activity}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {activity.activityName}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatHours(activity.hours)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(activity.costRate)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                        {formatCurrency(activity.costAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* 材料費セクション（原価側） */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700">材料費</h4>
              </div>
              {workOrder.materials.length > 0 ? (
                <div className="space-y-2">
                  {workOrder.materials.map((material) => (
                    <div key={material.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{material.name}</div>
                        <div className="text-xs text-gray-500">
                          {formatCurrency(material.unitPrice)} × {material.quantity}個
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(material.totalAmount)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  材料費はありません
                </div>
              )}
            </div>
            {/* 原価側合計 */}
            <div className="border-t border-gray-200 bg-gray-50 p-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">労務費小計</span>
                  <span className="text-sm font-medium">{formatCurrency(totals.costTotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">材料費小計</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(workOrder.materials.reduce((sum, m) => sum + m.totalAmount, 0))}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                  <span className="font-semibold text-gray-900">原価合計</span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(totals.costTotal + workOrder.materials.reduce((sum, m) => sum + m.totalAmount, 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 編集中の備考入力 */}
        {isEditing && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">調整理由</h3>
            <div className="space-y-4">
              {workOrder.activities.map((activity) => (
                <div key={activity.activity} className="flex items-center space-x-4">
                  <div className="w-24 text-sm font-medium text-gray-700">
                    {activity.activityName}
                  </div>
                  <input
                    type="text"
                    value={editedRates[activity.activity]?.memo || ''}
                    onChange={(e) => handleRateEdit(activity.activity, 'memo', e.target.value)}
                    placeholder="調整理由を入力..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 集計サマリー */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">集計サマリー</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">原価小計</div>
              <div className="text-xl font-semibold text-gray-900">{formatCurrency(totals.costTotal)}</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">請求小計</div>
              <div className="text-xl font-semibold text-blue-900">{formatCurrency(totals.billTotal)}</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">調整計</div>
              <div className={`text-xl font-semibold ${totals.adjustmentTotal === 0 ? 'text-gray-900' : totals.adjustmentTotal > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totals.adjustmentTotal)}
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">最終請求額</div>
              <div className="text-xl font-semibold text-purple-900">{formatCurrency(totals.finalAmount)}</div>
            </div>
          </div>
        </div>

        {/* 調整履歴 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">調整履歴</h3>
            <span className="text-sm text-gray-500">
              {workOrder.adjustments.length}件
            </span>
          </div>
          
          {workOrder.adjustments.length > 0 ? (
            <div className="space-y-3">
              {workOrder.adjustments.map((adjustment) => (
                <div key={adjustment.id} className="py-3 px-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{adjustment.reason}</div>
                      {adjustment.memo && (
                        <div className="text-sm text-gray-600 mt-1">{adjustment.memo}</div>
                      )}
                      <div className="text-xs text-gray-500 mt-2">
                        {new Date(adjustment.createdAt).toLocaleString('ja-JP', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          timeZone: 'Asia/Tokyo'
                        })} - {adjustment.createdBy}
                      </div>
                    </div>
                    <div className={`font-semibold text-lg ml-4 ${
                      adjustment.amount === 0 
                        ? 'text-gray-900' 
                        : adjustment.amount > 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                    }`}>
                      {adjustment.amount > 0 ? '+' : ''}{formatCurrency(adjustment.amount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">調整履歴はありません</p>
              <p className="text-gray-400 text-xs mt-1">単価を調整すると、ここに履歴が表示されます</p>
            </div>
          )}
        </div>
      </div>

      {/* 保存確認モーダル */}
      <SaveConfirmModal
        isOpen={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        onConfirm={handleSaveConfirm}
        changes={calculateChanges()}
      />


    </PageLayout>
  );
}
