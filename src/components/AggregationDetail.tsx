'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';

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
  }>;
}

interface AggregationDetailProps {
  workOrderId: string;
}

export default function AggregationDetail({ workOrderId }: AggregationDetailProps) {
  const router = useRouter();
  const [workOrder, setWorkOrder] = useState<WorkOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedRates, setEditedRates] = useState<Record<string, { billRate: string; memo: string }>>({});

  // APIからデータを取得
  const fetchWorkOrderDetail = async () => {
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
  };

  useEffect(() => {
    fetchWorkOrderDetail();
  }, [workOrderId]);

  const calculateTotals = () => {
    if (!workOrder) return { costTotal: 0, billTotal: 0, adjustmentTotal: 0, finalAmount: 0 };

    const costTotal = workOrder.activities.reduce((sum, activity) => sum + activity.costAmount, 0);
    const billTotal = workOrder.activities.reduce((sum, activity) => sum + activity.billAmount, 0);
    const adjustmentTotal = workOrder.activities.reduce((sum, activity) => sum + activity.adjustment, 0);
    const finalAmount = billTotal + adjustmentTotal;

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

  const handleSave = async () => {
    try {
      // 文字列を数値に変換してAPIに送信
      const adjustmentsForAPI: Record<string, { billRate: number; memo: string }> = {};
      Object.entries(editedRates).forEach(([activity, data]) => {
        adjustmentsForAPI[activity] = {
          billRate: parseInt(data.billRate) || 0,
          memo: data.memo,
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

      alert('変更が保存されました');
      setIsEditing(false);
      setEditedRates({});
      
      // データを再取得して最新状態を表示
      await fetchWorkOrderDetail();
    } catch (error) {
      console.error('保存エラー:', error);
      alert(error instanceof Error ? error.message : '保存中にエラーが発生しました');
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
                      onClick={handleSave}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      保存
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
                      {formatCurrency(activity.billAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span className={activity.adjustment === 0 ? 'text-gray-900' : activity.adjustment > 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(activity.adjustment)}
                      </span>
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
                <div key={adjustment.id} className="flex items-center justify-between py-2 px-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{adjustment.reason}</div>
                    {adjustment.memo && (
                      <div className="text-sm text-gray-600">{adjustment.memo}</div>
                    )}
                  </div>
                  <div className={`font-semibold ${adjustment.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(adjustment.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
