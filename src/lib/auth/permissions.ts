/**
 * 権限管理ユーティリティ
 */

import { AggregationAdjustment } from '@/types/aggregation';

export type UserRole = 'manager' | 'admin';

export interface User {
  id: string;
  name: string;
  role: UserRole;
}

/**
 * ユーザーが管理者かどうかを判定
 */
export function isAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'admin';
}

/**
 * ユーザーがマネージャーかどうかを判定
 */
export function isManager(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'manager';
}

/**
 * コメントを編集できるかどうかを判定
 * ルール: 自分のコメントのみ編集可能（Admin含む）
 */
export function canEditComment(
  comment: AggregationAdjustment,
  currentUser: User | null | undefined
): boolean {
  if (!currentUser) return false;
  
  // 自分のコメントのみ編集可能
  return comment.createdBy === currentUser.id;
}

/**
 * コメントを削除できるかどうかを判定
 * ルール:
 * - Admin: 全てのコメントを削除可能
 * - Manager: 自分のコメントのみ削除可能
 */
export function canDeleteComment(
  comment: AggregationAdjustment,
  currentUser: User | null | undefined
): boolean {
  if (!currentUser) return false;
  
  // Adminは全て削除可能
  if (isAdmin(currentUser)) {
    return true;
  }
  
  // Managerは自分のコメントのみ削除可能
  return comment.createdBy === currentUser.id;
}

/**
 * 管理者画面にアクセスできるかどうかを判定
 * （将来の管理者画面実装用）
 */
export function canAccessAdminPanel(user: User | null | undefined): boolean {
  return isAdmin(user);
}

