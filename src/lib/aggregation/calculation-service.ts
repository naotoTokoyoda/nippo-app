import { Prisma } from '@prisma/client';
import { groupByActivity, getActivityName, type ReportItemWithRelations, type ActivityGroup } from './activity-utils';

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
      const startTime = new Date(item.startTime);
      const endTime = new Date(item.endTime);
      return (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    }
  );

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
  // 現在有効な単価を取得
  const rate = await getCurrentRate(activityData.activity, tx);
  
  // 最初（デフォルト）の単価を取得
  const originalRate = await getOriginalRate(activityData.activity, tx);

  // 工番ごとのActivityメモを取得
  const activityMemo = await getActivityMemo(workOrderId, activityData.activity, tx);

  const costRate = rate?.costRate || DEFAULT_RATE;
  const billRate = rate?.billRate || DEFAULT_RATE;
  const originalBillRate = originalRate?.billRate || DEFAULT_RATE;
  const hours = Math.round(activityData.hours * 10) / 10;
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
 * 現在有効な単価を取得する
 */
async function getCurrentRate(activity: string, tx: Prisma.TransactionClient) {
  return await tx.rate.findFirst({
    where: {
      activity,
      effectiveFrom: {
        lte: new Date(),
      },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: new Date() } },
      ],
    },
    orderBy: {
      effectiveFrom: 'desc',
    },
  });
}

/**
 * 元の（最初の）単価を取得する
 */
async function getOriginalRate(activity: string, tx: Prisma.TransactionClient) {
  return await tx.rate.findFirst({
    where: {
      activity,
    },
    orderBy: {
      effectiveFrom: 'asc',
    },
  });
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

