/**
 * 監査ログサービス
 * 重要な操作を記録するためのユーティリティ
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export type AuditAction = 'access' | 'update';
export type AuditResourceType = 'page' | 'work_order';

export interface AuditLogInput {
  userId: string;
  userName: string;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * 監査ログを記録する
 */
export async function recordAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        userName: input.userName,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        details: input.details as object | undefined,
        ipAddress: input.ipAddress ?? undefined,
      },
    });
  } catch (error) {
    // 監査ログの記録失敗は業務処理に影響させない
    logger.error('Failed to record audit log', error instanceof Error ? error : new Error('Unknown error'), {
      component: 'audit-service',
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
    });
  }
}

/**
 * ページアクセスを記録する
 */
export async function recordPageAccess(
  userId: string,
  userName: string,
  pagePath: string,
  ipAddress?: string
): Promise<void> {
  await recordAuditLog({
    userId,
    userName,
    action: 'access',
    resourceType: 'page',
    resourceId: pagePath,
    ipAddress,
  });
}

/**
 * 工番のステータス変更を記録する
 */
export async function recordStatusChange(
  userId: string,
  userName: string,
  workOrderId: string,
  workNumber: string,
  oldStatus: string,
  newStatus: string,
  ipAddress?: string
): Promise<void> {
  await recordAuditLog({
    userId,
    userName,
    action: 'update',
    resourceType: 'work_order',
    resourceId: workOrderId,
    details: {
      field: 'status',
      workNumber,
      oldValue: oldStatus,
      newValue: newStatus,
    },
    ipAddress,
  });
}

/**
 * 最終決定金額の変更を記録する
 */
export async function recordFinalDecisionChange(
  userId: string,
  userName: string,
  workOrderId: string,
  workNumber: string,
  oldAmount: number | null | undefined,
  newAmount: number | null,
  ipAddress?: string
): Promise<void> {
  await recordAuditLog({
    userId,
    userName,
    action: 'update',
    resourceType: 'work_order',
    resourceId: workOrderId,
    details: {
      field: 'final_decision_amount',
      workNumber,
      oldValue: oldAmount,
      newValue: newAmount,
    },
    ipAddress,
  });
}
