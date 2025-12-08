/**
 * ステータス管理サービス
 * 
 * 工番のステータス更新とJootoタスクの移動を担当
 */

import { Prisma } from '@prisma/client';
import { moveJootoTask } from '@/lib/jooto-api';
import { logger } from '@/lib/logger';

/**
 * Prismaトランザクションクライアントの型
 */
type TransactionClient = Omit<
  Prisma.DefaultPrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * ステータス種別の型
 */
type WorkOrderStatus = 'delivered' | 'aggregating' | 'aggregated';

/**
 * ステータス遷移バリデーション結果
 */
export interface StatusTransitionValidation {
  isValid: boolean;
  error?: string;
  details?: string[];
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
  delivered: ['aggregating'],
  aggregating: ['delivered', 'aggregated'],
  aggregated: ['aggregating'],
};

/**
 * ステータス遷移が許可されているかチェック
 * 
 * @param currentStatus 現在のステータス
 * @param newStatus 新しいステータス
 * @returns 許可されているか
 */
export function isTransitionAllowed(
  currentStatus: WorkOrderStatus,
  newStatus: WorkOrderStatus
): boolean {
  if (currentStatus === newStatus) return true; // 同じステータスへの変更は許可
  return ALLOWED_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * 完了条件をチェック
 * 
 * 集計中 → 完了 に変更する場合の条件:
 * - 最終決定金額が入力されており、かつ0円より大きい
 * - 納品日が入力されている
 * 
 * @param finalDecisionAmount 最終決定金額
 * @param deliveryDate 納品日
 * @returns バリデーション結果
 */
export function validateCompletionConditions(
  finalDecisionAmount: number | null | undefined,
  deliveryDate: Date | null | undefined
): StatusTransitionValidation {
  const errors: string[] = [];

  // 最終決定金額のチェック
  if (finalDecisionAmount === null || finalDecisionAmount === undefined) {
    errors.push('最終決定金額が入力されていること');
  } else if (finalDecisionAmount <= 0) {
    errors.push('最終決定金額が0円より大きいこと');
  }

  // 納品日のチェック
  if (!deliveryDate) {
    errors.push('納品日が入力されていること');
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      error: '集計を完了するには以下の条件を満たしてください',
      details: errors,
    };
  }

  return { isValid: true };
}

/**
 * ステータス遷移をバリデーション
 * 
 * @param currentStatus 現在のステータス
 * @param newStatus 新しいステータス
 * @param workOrder 工番データ（完了条件チェック用）
 * @returns バリデーション結果
 */
export function validateStatusTransition(
  currentStatus: WorkOrderStatus,
  newStatus: WorkOrderStatus,
  workOrder?: {
    finalDecisionAmount: number | null;
    deliveryDate: Date | null;
  }
): StatusTransitionValidation {
  // 同じステータスへの変更は許可
  if (currentStatus === newStatus) {
    return { isValid: true };
  }

  // ステータス遷移が許可されているかチェック
  if (!isTransitionAllowed(currentStatus, newStatus)) {
    const statusLabels: Record<WorkOrderStatus, string> = {
      delivered: '納品済み',
      aggregating: '集計中',
      aggregated: '完了',
    };
    return {
      isValid: false,
      error: 'この操作は許可されていません',
      details: [`${statusLabels[currentStatus]}から${statusLabels[newStatus]}への変更はできません`],
    };
  }

  // 完了への遷移の場合、追加条件をチェック
  if (newStatus === 'aggregated' && workOrder) {
    return validateCompletionConditions(
      workOrder.finalDecisionAmount,
      workOrder.deliveryDate
    );
  }

  return { isValid: true };
}

/**
 * ステータス遷移情報の型
 */
interface StatusTransition {
  targetListId: string | undefined;
  description: string;
}

/**
 * ステータス遷移に応じたJootoリスト移動先を決定
 * 
 * @param currentStatus 現在のステータス
 * @param newStatus 新しいステータス
 * @returns 移動先の情報
 */
function determineJootoListTarget(
  currentStatus: string,
  newStatus: string
): StatusTransition {
  // ステータス遷移に応じた移動先を決定
  if (currentStatus === 'delivered' && newStatus === 'aggregating') {
    // 納品済み → 集計中
    return {
      targetListId: process.env.JOOTO_AGGREGATING_LIST_ID,
      description: '納品済み → 集計中',
    };
  } else if (currentStatus === 'aggregating' && newStatus === 'delivered') {
    // 集計中 → 納品済み（差し戻し）
    return {
      targetListId: process.env.JOOTO_DELIVERED_LIST_ID,
      description: '集計中 → 納品済み',
    };
  } else if (currentStatus === 'aggregating' && newStatus === 'aggregated') {
    // 集計中 → 完了（Freee納品書登録済み）
    return {
      targetListId: process.env.JOOTO_FREEE_INVOICE_REGISTERED_LIST_ID,
      description: '集計中 → Freee納品書登録済み',
    };
  } else if (currentStatus === 'aggregated' && newStatus === 'aggregating') {
    // 完了 → 集計中（差し戻し）
    return {
      targetListId: process.env.JOOTO_AGGREGATING_LIST_ID,
      description: 'Freee納品書登録済み → 集計中',
    };
  } else if (currentStatus === 'aggregated' && newStatus === 'delivered') {
    // 完了 → 納品済み（直接差し戻し）
    return {
      targetListId: process.env.JOOTO_DELIVERED_LIST_ID,
      description: 'Freee納品書登録済み → 納品済み',
    };
  }

  return {
    targetListId: undefined,
    description: '',
  };
}

/**
 * 工番のステータスを更新（トランザクション内）
 * 
 * @param workOrderId 工番ID
 * @param newStatus 新しいステータス
 * @param tx Prismaトランザクション
 */
export async function updateWorkOrderStatus(
  workOrderId: string,
  newStatus: WorkOrderStatus,
  tx: TransactionClient
): Promise<void> {
  await tx.workOrder.update({
    where: { id: workOrderId },
    data: { status: newStatus },
  });

  logger.info(`Updated work order status: ${workOrderId} -> ${newStatus}`);
}

/**
 * ステータスのみを更新（軽量版、トランザクションなし）
 * 
 * @param workOrderId 工番ID
 * @param currentStatus 現在のステータス
 * @param newStatus 新しいステータス
 * @param prisma Prismaクライアント
 */
export async function updateStatusOnly(
  workOrderId: string,
  currentStatus: string,
  newStatus: WorkOrderStatus,
  prisma: Prisma.DefaultPrismaClient
): Promise<void> {
  await prisma.workOrder.update({
    where: { id: workOrderId },
    data: { status: newStatus },
  });

  logger.info(`Status only update: ${currentStatus} -> ${newStatus}`);
}

/**
 * Jootoタスクを移動（ベストエフォート、エラーは無視）
 * 
 * @param taskId JootoタスクID（'jooto-'プレフィックスを含む）
 * @param currentStatus 現在のステータス
 * @param newStatus 新しいステータス
 */
export async function moveJootoTaskByStatus(
  taskId: string,
  currentStatus: string,
  newStatus: string
): Promise<void> {
  if (!taskId.startsWith('jooto-')) {
    return;
  }

  try {
    const cleanTaskId = taskId.replace('jooto-', '');
    const { targetListId, description } = determineJootoListTarget(currentStatus, newStatus);

    if (targetListId) {
      await moveJootoTask(cleanTaskId, targetListId);
      logger.info(`Moved Jooto task ${cleanTaskId}: ${description}`);
    } else {
      logger.warn(`Target list ID not found for status change: ${currentStatus} → ${newStatus}`);
    }
  } catch (jootoError) {
    // Jootoの移動が失敗してもデータベースの更新は成功として扱う
    logger.error(
      'Jooto task move failed, but database update succeeded',
      jootoError instanceof Error ? jootoError : new Error('Unknown error')
    );
  }
}

