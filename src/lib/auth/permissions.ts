/**
 * 権限管理ユーティリティ
 */

import { AggregationAdjustment } from '@/types/aggregation';

export type UserRole = 'superAdmin' | 'admin' | 'manager' | 'member';

export interface User {
  id: string;
  name: string;
  role: UserRole;
}

/**
 * ユーザーがスーパー管理者かどうかを判定
 */
export function isSuperAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'superAdmin';
}

/**
 * ユーザーが管理者かどうかを判定（superAdminも含む）
 */
export function isAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'superAdmin';
}

/**
 * ユーザーがマネージャーかどうかを判定
 */
export function isManager(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'manager';
}

/**
 * ユーザーがメンバー（作業者）かどうかを判定
 */
export function isMember(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'member';
}

/**
 * 集計機能にアクセスできるかどうかを判定
 * ルール: superAdmin または admin のみ
 */
export function canAccessAggregation(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'superAdmin' || user.role === 'admin';
}

/**
 * 管理画面にアクセスできるかどうかを判定
 * ルール: superAdmin または admin のみ
 */
export function canAccessAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'superAdmin' || user.role === 'admin';
}

/**
 * 監査ログを閲覧できるかどうかを判定
 * ルール: superAdmin, admin, manager のみ
 */
export function canViewAuditLog(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'superAdmin' || user.role === 'admin' || user.role === 'manager';
}

/**
 * ユーザーを管理（追加・編集・削除）できるかどうかを判定
 * ルール:
 * - superAdmin: 全ロールを管理可能
 * - admin: manager, member のみ管理可能（admin, superAdminは管理不可）
 * - manager: 管理不可
 * - member: 管理不可
 */
export function canManageUser(
  currentUserRole: UserRole | null | undefined,
  targetUserRole: UserRole
): boolean {
  if (!currentUserRole) return false;
  
  // superAdmin は全ロールを管理可能
  if (currentUserRole === 'superAdmin') {
    return true;
  }
  
  // admin は manager, member のみ管理可能（admin, superAdminは管理不可）
  if (currentUserRole === 'admin') {
    return targetUserRole === 'manager' || targetUserRole === 'member';
  }
  
  return false;
}

/**
 * 特定のロールを持つユーザーを作成できるかどうかを判定
 * ルール:
 * - superAdmin: 全ロールを作成可能
 * - admin: manager, member のみ作成可能（admin, superAdminは作成不可）
 * - manager: 作成不可
 * - member: 作成不可
 */
export function canCreateUserWithRole(
  currentUserRole: UserRole | null | undefined,
  newUserRole: UserRole
): boolean {
  if (!currentUserRole) return false;
  
  // superAdmin は全ロールを作成可能
  if (currentUserRole === 'superAdmin') {
    return true;
  }
  
  // admin は manager, member のみ作成可能
  if (currentUserRole === 'admin') {
    return newUserRole === 'manager' || newUserRole === 'member';
  }
  
  return false;
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
 * - superAdmin / admin / manager: 全てのコメントを削除可能
 */
export function canDeleteComment(
  comment: AggregationAdjustment,
  currentUser: User | null | undefined
): boolean {
  if (!currentUser) return false;
  
  // superAdmin / admin / manager は全て削除可能
  if (currentUser.role === 'superAdmin' || currentUser.role === 'admin' || currentUser.role === 'manager') {
    return true;
  }
  
  // それ以外は自分のコメントのみ削除可能
  return comment.createdBy === currentUser.id;
}

/**
 * 日報を入力できるかどうかを判定
 * ルール: manager または member（admin は日報入力しない）
 */
export function canInputReport(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'manager' || user.role === 'member';
}

/**
 * 自分の日報を編集できるかどうかを判定
 * ルール: 日報の作成者のみ編集可能
 */
export function canEditOwnReport(
  reportWorkerId: string,
  currentUserId: string | null | undefined
): boolean {
  if (!currentUserId) return false;
  return reportWorkerId === currentUserId;
}
