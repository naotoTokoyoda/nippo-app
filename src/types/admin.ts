/**
 * 管理画面用の型定義
 */

// ユーザー管理
export type UserRole = 'admin' | 'manager' | 'member';

export interface AdminUser {
  id: string;
  name: string;
  role: UserRole;
  email: string | null;
  pin: string;
  isTrainee: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  name: string;
  role: UserRole;
  email?: string;
  password?: string;
  pin: string;
  isTrainee: boolean;
  isActive: boolean;
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  email?: string;
  password?: string;
  pin?: string;
  isTrainee?: boolean;
  isActive?: boolean;
}

// 単価管理
export type ActivityType = 'labor' | 'machine';

export interface AdminRate {
  id: string;
  activity: string;
  activityType: ActivityType;
  displayName: string;
  costRate: number;
  billRate: number;
  memo: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRateInput {
  activity: string;
  activityType: ActivityType;
  displayName: string;
  costRate: number;
  billRate: number;
  memo?: string;
}

export interface UpdateRateInput {
  costRate?: number;
  billRate?: number;
  memo?: string;
}

// 機械管理
export interface AdminMachine {
  id: string;
  name: string;
  isActive: boolean;
  memo: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMachineInput {
  name: string;
  isActive: boolean;
  memo?: string;
}

export interface UpdateMachineInput {
  name?: string;
  isActive?: boolean;
  memo?: string;
}

// 経費マークアップ率管理
export interface AdminMarkupSetting {
  id: string;
  category: string;
  markupRate: number;
  memo: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMarkupSettingInput {
  category: string;
  markupRate: number;
  memo?: string;
}

export interface UpdateMarkupSettingInput {
  markupRate?: number;
  memo?: string;
}

