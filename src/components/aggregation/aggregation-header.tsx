'use client';

import { useMemo } from 'react';
import { WorkOrderDetail } from '@/types/aggregation';

type WorkOrderStatus = 'aggregating' | 'aggregated' | 'delivered';

interface StatusOption {
  value: WorkOrderStatus;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
}

interface AggregationHeaderProps {
  workOrder: WorkOrderDetail;
  formatHours: (hours: number) => string;
  onStatusChange?: (newStatus: WorkOrderStatus) => Promise<void>;
  isStatusChanging?: boolean;
}

/**
 * 許可されたステータス遷移を定義
 * 
 * - delivered → aggregating: 許可
 * - delivered → aggregated: 禁止（集計中をスキップできない）
 * - aggregating → delivered: 許可（差し戻し）
 * - aggregating → aggregated: 許可（条件あり）
 * - aggregated → aggregating: 許可（差し戻し）
 * - aggregated → delivered: 禁止
 */
const ALLOWED_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  delivered: ['delivered', 'aggregating'],
  aggregating: ['aggregating', 'delivered', 'aggregated'],
  aggregated: ['aggregated', 'aggregating'],
};

/**
 * ステータス表示ラベル
 */
const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  delivered: '納品済み',
  aggregating: '集計中',
  aggregated: '完了',
};

/**
 * 現在のステータスに応じた選択可能なオプションを取得
 */
function getAvailableStatusOptions(
  currentStatus: WorkOrderStatus,
  finalDecisionAmount: number | null | undefined,
  deliveryDate: Date | string | null | undefined
): StatusOption[] {
  const allowedStatuses = ALLOWED_TRANSITIONS[currentStatus] || [currentStatus];
  
  return (['delivered', 'aggregating', 'aggregated'] as WorkOrderStatus[]).map(status => {
    const isAllowed = allowedStatuses.includes(status);
    
    // 完了への遷移は追加条件をチェック
    let disabledReason: string | undefined;
    if (status === 'aggregated' && currentStatus === 'aggregating') {
      const missingConditions: string[] = [];
      if (!finalDecisionAmount || finalDecisionAmount <= 0) {
        missingConditions.push('最終決定金額が0円より大きいこと');
      }
      if (!deliveryDate) {
        missingConditions.push('納品日が入力されていること');
      }
      if (missingConditions.length > 0) {
        disabledReason = `完了には以下が必要:\n${missingConditions.join('\n')}`;
      }
    } else if (!isAllowed && status !== currentStatus) {
      disabledReason = `${STATUS_LABELS[currentStatus]}から${STATUS_LABELS[status]}への変更はできません`;
    }

    return {
      value: status,
      label: STATUS_LABELS[status],
      disabled: !isAllowed || (status === 'aggregated' && !!disabledReason),
      disabledReason,
    };
  });
}

export default function AggregationHeader({ workOrder, formatHours, onStatusChange, isStatusChanging }: AggregationHeaderProps) {
  // 選択可能なステータスオプションを計算
  const statusOptions = useMemo(() => {
    return getAvailableStatusOptions(
      workOrder.status as WorkOrderStatus,
      workOrder.finalDecisionAmount,
      workOrder.deliveryDate
    );
  }, [workOrder.status, workOrder.finalDecisionAmount, workOrder.deliveryDate]);

  // 完了への遷移が無効な場合の理由を取得
  const completionDisabledReason = useMemo(() => {
    const aggregatedOption = statusOptions.find(opt => opt.value === 'aggregated');
    return aggregatedOption?.disabledReason;
  }, [statusOptions]);

  // 完了条件を満たしているか
  const canComplete = useMemo(() => {
    const aggregatedOption = statusOptions.find(opt => opt.value === 'aggregated');
    return aggregatedOption && !aggregatedOption.disabled;
  }, [statusOptions]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">工番</label>
          <div className="text-lg font-semibold">{workOrder.workNumber}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">顧客</label>
          <div className="text-lg font-semibold">{workOrder.customerName}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">案件名</label>
          <div className="text-lg font-semibold">{workOrder.projectName}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">総時間</label>
          <div className="text-lg font-semibold">{formatHours(workOrder.totalHours)}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">ステータス</label>
          <div className="flex items-center gap-2">
            <select
              value={workOrder.status}
              onChange={async (e) => {
                const newStatus = e.target.value as WorkOrderStatus;
                if (onStatusChange && newStatus !== workOrder.status) {
                  await onStatusChange(newStatus);
                }
              }}
              disabled={isStatusChanging}
              className="block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {statusOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}{option.disabled && option.value !== workOrder.status ? ' (不可)' : ''}
                </option>
              ))}
            </select>
            {isStatusChanging && (
              <div className="flex-shrink-0">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
          {/* 完了条件を満たしていない場合の警告表示 */}
          {workOrder.status === 'aggregating' && !canComplete && completionDisabledReason && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-xs text-amber-700 font-medium">完了するには以下が必要です:</p>
              <ul className="mt-1 text-xs text-amber-600 list-disc list-inside">
                {(!workOrder.finalDecisionAmount || workOrder.finalDecisionAmount <= 0) && (
                  <li>最終決定金額が0円より大きいこと</li>
                )}
                {!workOrder.deliveryDate && (
                  <li>納品日が入力されていること</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
