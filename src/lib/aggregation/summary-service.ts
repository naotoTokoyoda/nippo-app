/**
 * 集計サマリー管理サービス
 * 
 * 集計完了時のサマリー作成を担当
 */

import { Prisma } from '@prisma/client';
import { calculateActivitiesForWorkOrder, calculateSummary } from '@/lib/aggregation/calculation-service';
import { logger } from '@/lib/logger';

/**
 * Prismaトランザクションクライアントの型
 */
type TransactionClient = Omit<
  Prisma.DefaultPrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * 工番情報の型
 */
interface WorkOrderInfo {
  id: string;
  frontNumber: string;
  backNumber: string;
  projectName: string | null;
  description: string | null;
  customer: {
    name: string;
  };
}

/**
 * システムユーザーのIDを取得または作成
 * 
 * @param tx Prismaトランザクション
 * @returns システムユーザーID
 */
async function getOrCreateSystemUserId(tx: TransactionClient): Promise<string> {
  const existingUser = await tx.user.findFirst({
    where: { name: 'システム' }
  });
  
  if (existingUser) {
    return existingUser.id;
  }

  // システムユーザーを作成
  const systemUser = await tx.user.create({
    data: {
      name: 'システム',
    },
  });

  return systemUser.id;
}

/**
 * 集計サマリーを作成
 * 
 * @param workOrder 工番情報
 * @param tx Prismaトランザクション
 */
export async function createAggregationSummary(
  workOrder: WorkOrderInfo,
  tx: TransactionClient
): Promise<void> {
  // 現在の集計結果を計算
  const currentActivities = await calculateActivitiesForWorkOrder(workOrder.id, tx);
  const currentExpenses = await tx.material.findMany({
    where: { workOrderId: workOrder.id },
  });

  // 合計値を計算
  const summary = calculateSummary(currentActivities, currentExpenses);
  const { totalHours, costTotal, billTotal, expenseBillTotal, adjustmentTotal, finalAmount } = summary;

  // Activity別詳細をJSON形式で準備
  const activityBreakdown = currentActivities.map(activity => ({
    activity: activity.activity,
    activityName: activity.activityName,
    hours: activity.hours,
    costRate: activity.costRate,
    billRate: activity.billRate,
    costAmount: activity.costAmount,
    billAmount: activity.billAmount,
    adjustment: activity.adjustment,
  }));

  // 経費詳細をJSON形式で準備
  const materialBreakdown = currentExpenses.map(expense => ({
    category: expense.category,
    costUnitPrice: expense.costUnitPrice,
    costQuantity: expense.costQuantity,
    costTotal: expense.costTotal,
    billUnitPrice: expense.billUnitPrice,
    billQuantity: expense.billQuantity,
    billTotal: expense.billTotal,
    fileEstimate: expense.fileEstimate,
  }));

  // システムユーザーIDを取得
  const systemUserId = await getOrCreateSystemUserId(tx);

  // AggregationSummaryレコードを作成
  await tx.aggregationSummary.create({
    data: {
      workOrderId: workOrder.id,
      workNumber: `${workOrder.frontNumber}-${workOrder.backNumber}`,
      customerName: workOrder.customer.name,
      projectName: workOrder.projectName || workOrder.description || '未設定',
      totalHours: totalHours,
      costTotal: costTotal,
      billTotal: billTotal,
      materialTotal: expenseBillTotal,
      adjustmentTotal: adjustmentTotal,
      finalAmount: finalAmount,
      activityBreakdown: activityBreakdown,
      materialBreakdown: materialBreakdown,
      aggregatedAt: new Date(),
      aggregatedBy: systemUserId,
      memo: '集計完了',
    },
  });

  logger.info(`Created aggregation summary for work order ${workOrder.id}: totalHours=${totalHours}, finalAmount=${finalAmount}`);
}

