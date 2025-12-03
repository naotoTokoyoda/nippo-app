/**
 * 単価調整・調整履歴管理サービス
 * 
 * 単価調整、Activity別メモ管理、調整履歴の記録を担当
 */

import { Prisma } from '@prisma/client';
import { determineActivity, getActivityName } from '@/lib/aggregation/activity-utils';
import { logger } from '@/lib/logger';

/**
 * Prismaトランザクションクライアントの型
 */
type TransactionClient = Omit<
  Prisma.DefaultPrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * 単価調整情報の型
 */
export interface RateAdjustment {
  billRate: number;
  memo?: string;
}

/**
 * 通貨フォーマット関数
 */
function formatCurrency(amount: number): string {
  return amount.toLocaleString();
}

/**
 * システムユーザーのIDを取得または作成
 * 
 * @param tx Prismaトランザクション
 * @returns システムユーザーID
 */
async function getOrCreateSystemUserId(tx: TransactionClient): Promise<string> {
  let systemUserId: string;
  const existingUser = await tx.user.findFirst({
    where: { name: 'システム' }
  });
  
  if (existingUser) {
    systemUserId = existingUser.id;
  } else {
    // システムユーザーを作成
    const systemUser = await tx.user.create({
      data: {
        name: 'システム',
      },
    });
    systemUserId = systemUser.id;
  }
  
  return systemUserId;
}

/**
 * Activityメモを更新
 * 
 * @param workOrderId 工番ID
 * @param activity Activity種別
 * @param memo メモ内容
 * @param tx Prismaトランザクション
 */
async function updateActivityMemo(
  workOrderId: string,
  activity: string,
  memo: string | undefined,
  tx: TransactionClient
): Promise<void> {
  if (memo === undefined) {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (tx as any).workOrderActivityMemo.upsert({
    where: {
      workOrderId_activity: {
        workOrderId,
        activity,
      },
    },
    update: {
      memo: memo || null,
    },
    create: {
      workOrderId,
      activity,
      memo: memo || null,
    },
  });
}

/**
 * 単価変更の調整履歴を作成
 * 
 * @param workOrderId 工番ID
 * @param activity Activity種別
 * @param oldBillRate 旧単価
 * @param newBillRate 新単価
 * @param memo メモ
 * @param userId 操作ユーザーID
 * @param tx Prismaトランザクション
 */
async function createRateAdjustmentHistory(
  workOrderId: string,
  activity: string,
  oldBillRate: number,
  newBillRate: number,
  memo: string | undefined,
  userId: string | undefined,
  tx: TransactionClient
): Promise<void> {
  const rateDifference = newBillRate - oldBillRate;
  
  // 単価が変更されていない場合は何もしない
  if (rateDifference === 0) {
    return;
  }

  // ユーザーIDが指定されている場合は存在確認
  let effectiveUserId: string;
  if (userId) {
    const userExists = await tx.user.findUnique({
      where: { id: userId },
    });
    effectiveUserId = userExists ? userId : await getOrCreateSystemUserId(tx);
  } else {
    effectiveUserId = await getOrCreateSystemUserId(tx);
  }

  // この工番のこのactivityの総時間を取得
  const reportItems = await tx.reportItem.findMany({
    where: {
      workOrderId,
    },
    include: {
      report: {
        include: {
          worker: true,
        },
      },
      machine: true,
    },
  });
  
  // activityが一致するreportItemsのみを集計
  const filteredItems = reportItems.filter(item => determineActivity(item) === activity);
  const totalHours = filteredItems.reduce((sum, item) => {
    const hours = (item.endTime.getTime() - item.startTime.getTime()) / (1000 * 60 * 60);
    return sum + hours;
  }, 0);
  const totalAdjustment = Math.round(totalHours * rateDifference);

  await tx.adjustment.create({
    data: {
      workOrderId,
      type: 'rate_adjustment',
      amount: totalAdjustment,
      reason: `${activity}単価調整 (${formatCurrency(oldBillRate)} → ${formatCurrency(newBillRate)})`,
      memo: memo || null,
      createdBy: effectiveUserId,
    },
  });

  logger.info(`Created rate adjustment history: ${activity} ${oldBillRate} -> ${newBillRate}, adjustment: ${totalAdjustment}`);
}


/**
 * 単価を更新
 * 
 * @param activity Activity種別
 * @param newBillRate 新単価
 * @param currentCostRate 現在の原価単価
 * @param tx Prismaトランザクション
 */
async function updateRate(
  activity: string,
  currentRateId: string,
  newBillRate: number,
  currentCostRate: number,
  tx: TransactionClient
): Promise<void> {
  // 人工費か機械費かを判定
  const isMachine = activity.startsWith('M_');
  
  if (isMachine) {
    // 機械単価の更新（単純にUPDATE）
    await tx.machineRate.update({
      where: { id: currentRateId },
      data: {
        billRate: newBillRate,
        costRate: currentCostRate,
      },
    });
  } else {
    // 人工費単価の更新（単純にUPDATE）
    await tx.laborRate.update({
      where: { id: currentRateId },
      data: {
        billRate: newBillRate,
        costRate: currentCostRate,
      },
    });
  }

  logger.info(`Updated rate for ${activity}: new billRate = ${newBillRate}`);
}

/**
 * 単価調整を処理
 * 
 * @param workOrderId 工番ID
 * @param adjustments 単価調整の情報
 * @param userId 操作ユーザーID（省略時はシステムユーザー）
 * @param tx Prismaトランザクション
 */
export async function processRateAdjustments(
  workOrderId: string,
  adjustments: Record<string, RateAdjustment>,
  tx: TransactionClient,
  userId?: string
): Promise<void> {
  for (const [activity, adjustment] of Object.entries(adjustments)) {
    // 人工費か機械費かを判定
    const isMachine = activity.startsWith('M_');
    
    // 既存の単価を取得
    let currentRate: { id: string; billRate: number; costRate: number } | null = null;
    
    if (isMachine) {
      // 機械単価を取得
      // activityから機械名を抽出（例：「M_1052」→「1052」）
      const machineName = getActivityName(activity);
      
      // 機械名からmachineを検索（部分一致）
      const machine = await tx.machine.findFirst({
        where: { name: { contains: machineName } },
      });
      
      if (machine) {
        // machineIdを使ってMachineRateを取得
        currentRate = await tx.machineRate.findUnique({
          where: { machineId: machine.id },
        }) as { id: string; billRate: number; costRate: number } | null;
      } else {
        logger.warn(`Machine not found for activity ${activity} (machine name: ${machineName})`);
        continue;
      }
    } else {
      // 人工費単価を取得
      const laborName = getActivityName(activity); // '通常作業'、'実習生'など
      currentRate = await tx.laborRate.findUnique({
        where: {
          laborName,
        },
      }) as { id: string; billRate: number; costRate: number } | null;
    }

    // Activityメモを更新
    await updateActivityMemo(workOrderId, activity, adjustment.memo, tx);

    if (currentRate && currentRate.billRate !== adjustment.billRate) {
      // 単価が変更された場合
      
      // 単価を更新
      await updateRate(
        activity,
        currentRate.id,
        adjustment.billRate,
        currentRate.costRate,
        tx
      );

      // 調整履歴を作成
      await createRateAdjustmentHistory(
        workOrderId,
        activity,
        currentRate.billRate,
        adjustment.billRate,
        adjustment.memo,
        userId,
        tx
      );
    }
    // メモのみの変更は調整履歴に記録しない（Activity別メモで確認可能）
  }

  logger.info(`Processed rate adjustments for work order ${workOrderId}: ${Object.keys(adjustments).length} activities`);
}

