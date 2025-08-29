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

interface WorkOrderDetail {
  id: string;
  workNumber: string;
  customerName: string;
  projectName: string;
  term: string;
  status: 'aggregating' | 'aggregated';
  totalHours: number;
  activities: ActivitySummary[];
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

  useEffect(() => {
    fetchWorkOrderDetail();
  }, [fetchWorkOrderDetail]);

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
    if (confirm('単価を確定しますか？確定後は編集できなくなります。')) {
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
          throw new Error(errorData.error || '確定処理に失敗しました');
        }

        alert('単価が確定されました');
        router.push('/aggregation');
      } catch (error) {
        console.error('確定エラー:', error);
        alert(error instanceof Error ? error.message : '確定処理中にエラーが発生しました');
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

  if (loading) {
    return (
      <PageLayout title="集計詳細">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  単価確定
                </button>
              </>
            )}
          </div>
        </div>

        {/* 区分別集計表 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    区分
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    時間
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    原価単価
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    原価
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    請求単価
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    請求小計
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    調整
                  </th>
                  {isEditing && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      備考
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {workOrder.activities.map((activity) => (
                  <tr key={activity.activity}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {activity.activityName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatHours(activity.hours)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(activity.costRate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(activity.costAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editedRates[activity.activity]?.billRate ?? activity.billRate.toString()}
                          onChange={(e) => handleRateEdit(activity.activity, 'billRate', e.target.value)}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                          min="0"
                          step="1000"
                        />
                      ) : (
                        formatCurrency(activity.billRate)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {(() => {
                        const editedRate = editedRates[activity.activity];
                        const currentBillRate = editedRate ? parseInt(editedRate.billRate) || activity.billRate : activity.billRate;
                        const currentBillAmount = activity.hours * currentBillRate;
                        return formatCurrency(currentBillAmount);
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {(() => {
                        const editedRate = editedRates[activity.activity];
                        
                        // 編集中の場合は差額を計算
                        if (editedRate) {
                          const currentBillRate = parseInt(editedRate.billRate) || 0;
                          const originalBillRate = activity.billRate;
                          const originalAmount = activity.hours * originalBillRate;
                          const newAmount = activity.hours * currentBillRate;
                          const adjustment = newAmount - originalAmount;
                          
                          return (
                            <span className={adjustment === 0 ? 'text-gray-900' : adjustment > 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(adjustment)}
                            </span>
                          );
                        }
                        
                        // 編集されていない場合はAPIから返された調整額を使用
                        const adjustment = activity.adjustment;
                        return (
                          <span className={adjustment === 0 ? 'text-gray-900' : adjustment > 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(adjustment)}
                          </span>
                        );
                      })()}
                    </td>
                    {isEditing && (
                      <td className="px-6 py-4 text-sm">
                        <input
                          type="text"
                          value={editedRates[activity.activity]?.memo || ''}
                          onChange={(e) => handleRateEdit(activity.activity, 'memo', e.target.value)}
                          placeholder="調整理由"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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
        {workOrder.adjustments.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">調整履歴</h3>
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
          </div>
        )}
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
