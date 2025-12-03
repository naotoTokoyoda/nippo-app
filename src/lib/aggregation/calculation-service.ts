import { Prisma } from '@prisma/client';
import { groupByActivity, getActivityName, type ReportItemWithRelations, type ActivityGroup } from './activity-utils';
import { formatUTCToJSTTime, calculateWorkTime } from '@/utils/timeCalculation';

/**
 * アクティビティサマリー
 */
export interface ActivitySummary {
  activity: string;
  activityName: string;
  hours: number;
  costRate: number;
  billRate: number;
  costAmount: number;
  billAmount: number;
  adjustment: number;
  memo?: string;
}

/**
 * デフォルトの単価（単価が見つからない場合）
 */
const DEFAULT_RATE = 11000;

/**
 * WorkOrderのActivity別集計を計算する
 * 
 * @param workOrderId 工番ID
 * @param tx Prismaトランザクションクライアント
 * @returns アクティビティサマリーの配列
 */
export async function calculateActivitiesForWorkOrder(
  workOrderId: string,
  tx: Prisma.TransactionClient
): Promise<ActivitySummary[]> {
  // WorkOrderとreportItemsを取得
  const workOrder = await tx.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      reportItems: {
        include: {
          report: {
            include: {
              worker: true,
            },
          },
          machine: true,
        },
      },
    },
  });

  if (!workOrder) {
    throw new Error('WorkOrder not found');
  }

  // Activity別に集計
  const activityMap = groupByActivity(
    workOrder.reportItems as ReportItemWithRelations[],
    (item) => {
      // UTC時間をJST時間に変換
      const startTime = formatUTCToJSTTime(item.startTime);
      const endTime = formatUTCToJSTTime(item.endTime);
      // 昼休憩を考慮した正確な作業時間を計算
      return calculateWorkTime(startTime, endTime, item.workStatus || 'normal');
    }
  );

  // INSPECTION（検品）をNORMALに統合（廃止処理）
  if (activityMap.has('INSPECTION')) {
    const inspectionData = activityMap.get('INSPECTION')!;
    
    if (!activityMap.has('NORMAL')) {
      // NORMALがない場合は、INSPECTIONをNORMALに変更
      activityMap.set('NORMAL', {
        activity: 'NORMAL',
        hours: inspectionData.hours,
        items: inspectionData.items,
      });
    } else {
      // NORMALがある場合は、INSPECTIONをマージ
      const normalData = activityMap.get('NORMAL')!;
      normalData.hours += inspectionData.hours;
      normalData.items.push(...inspectionData.items);
    }
    
    // INSPECTIONを削除
    activityMap.delete('INSPECTION');
  }

  // 各Activity別の単価・金額を計算
  const activities = await Promise.all(
    Array.from(activityMap.values()).map(async (activityData: ActivityGroup) =>
      calculateActivitySummary(workOrderId, activityData, tx)
    )
  );

  return activities;
}

/**
 * 単一のアクティビティの集計を計算する
 */
async function calculateActivitySummary(
  workOrderId: string,
  activityData: ActivityGroup,
  tx: Prisma.TransactionClient
): Promise<ActivitySummary> {
  // activityDataから最初のアイテムを取得（machineIdやworker情報を取得するため）
  const firstItem = activityData.items[0];
  
  // 現在有効な単価を取得
  const rate = await getCurrentRate(activityData.activity, firstItem, tx);
  
  // 最初（デフォルト）の単価を取得
  const originalRate = await getOriginalRate(activityData.activity, firstItem, tx);

  // 工番ごとのActivityメモを取得
  const activityMemo = await getActivityMemo(workOrderId, activityData.activity, tx);

  const costRate = rate?.costRate || DEFAULT_RATE;
  const billRate = rate?.billRate || DEFAULT_RATE;
  const originalBillRate = originalRate?.billRate || DEFAULT_RATE;
  const hours = activityData.hours;
  const costAmount = Math.round(hours * costRate);
  const billAmount = Math.round(hours * billRate);
  
  // 調整額 = 現在の請求額 - 元の請求額
  const originalBillAmount = Math.round(hours * originalBillRate);
  const adjustment = billAmount - originalBillAmount;

  return {
    activity: activityData.activity,
    activityName: getActivityName(activityData.activity),
    hours,
    costRate,
    billRate,
    costAmount,
    billAmount,
    adjustment,
    memo: activityMemo?.memo || undefined,
  };
}

/**
 * 現在の単価を取得する
 */
async function getCurrentRate(
  activity: string, 
  reportItem: ReportItemWithRelations,
  tx: Prisma.TransactionClient
) {
  // 人工費か機械費かを判定
  if (activity.startsWith('M_')) {
    // 機械費：reportItemからmachineIdを取得して、MachineRateから検索
    return await tx.machineRate.findUnique({
      where: {
        machineId: reportItem.machineId,
      },
    });
  } else {
    // 人工費：activityから判定してLaborRateから検索
    const laborName = getActivityName(activity); // '通常'、'1号実習生'など
    
    return await tx.laborRate.findUnique({
      where: {
        laborName: laborName,
      },
    });
  }
}

/**
 * 元の（最初の）単価を取得する
 * ※履歴機能廃止により、getCurrentRateと同じ動作
 */
async function getOriginalRate(
  activity: string,
  reportItem: ReportItemWithRelations,
  tx: Prisma.TransactionClient
) {
  // 履歴機能廃止により、現在の単価と同じ
  return await getCurrentRate(activity, reportItem, tx);
}

/**
 * 工番ごとのActivityメモを取得する
 */
async function getActivityMemo(
  workOrderId: string,
  activity: string,
  tx: Prisma.TransactionClient
): Promise<{ memo: string } | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return await (tx as any).workOrderActivityMemo.findUnique({
    where: {
      workOrderId_activity: {
        workOrderId,
        activity,
      },
    },
  });
}

/**
 * 集計サマリーを計算する
 */
export function calculateSummary(
  activities: ActivitySummary[],
  expenses: Array<{ billTotal: number }>
) {
  const totalHours = activities.reduce((sum, activity) => sum + activity.hours, 0);
  const costTotal = activities.reduce((sum, activity) => sum + activity.costAmount, 0);
  const billTotal = activities.reduce((sum, activity) => sum + activity.billAmount, 0);
  const expenseBillTotal = expenses.reduce((sum, expense) => sum + expense.billTotal, 0);
  const adjustmentTotal = activities.reduce((sum, activity) => sum + activity.adjustment, 0);
  const finalAmount = billTotal + expenseBillTotal;

  return {
    totalHours,
    costTotal,
    billTotal,
    expenseBillTotal,
    adjustmentTotal,
    finalAmount,
  };
}

