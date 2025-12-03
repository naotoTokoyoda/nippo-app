import { Prisma } from '@prisma/client';

/**
 * レポートアイテムの型定義
 */
export type ReportItemWithRelations = Prisma.ReportItemGetPayload<{
  include: {
    machine: true;
    report: {
      include: {
        worker: true;
      };
    };
  };
}>;

/**
 * アクティビティタイプ
 */
export type ActivityType = 
  | 'NORMAL'
  | 'TRAINEE1'
  | 'INSPECTION'
  | 'M_1052'
  | 'M_SHOMEN'
  | 'M_12SHAKU';

/**
 * アクティビティ名のマッピング
 * ※データベースのlaborNameと一致させる必要がある
 */
export const ACTIVITY_NAMES: Record<ActivityType, string> = {
  'NORMAL': '通常作業',
  'TRAINEE1': '実習生', 
  'INSPECTION': '検品（廃止）',
  'M_1052': '1052',
  'M_SHOMEN': '正面盤',
  'M_12SHAKU': '12尺',
};

/**
 * 労務費カテゴリ
 */
export type LaborCategory = 'LABOR' | 'MACHINE';

/**
 * 労務費カテゴリ名のマッピング
 */
export const LABOR_CATEGORY_NAMES: Record<LaborCategory, string> = {
  'LABOR': '人工費',
  'MACHINE': '機械稼働費',
};

/**
 * アクティビティタイプから労務費カテゴリを判定する
 */
export function getLaborCategory(activity: ActivityType): LaborCategory {
  // 機械関連のアクティビティ
  if (activity === 'M_1052' || activity === 'M_SHOMEN' || activity === 'M_12SHAKU') {
    return 'MACHINE';
  }
  // それ以外（通常、実習生、検品）は人工費
  return 'LABOR';
}

/**
 * レポートアイテムからアクティビティを判定する
 * 
 * 判定ロジック：
 * 1. 機械種類による判定（優先）
 * 2. 実習生フラグ（isTrainee）→ 実習生
 * 3. デフォルト → 通常作業
 * 
 * 注：検品（INSPECTION）は廃止され、通常作業（NORMAL）に統合されました
 */
export function determineActivity(reportItem: ReportItemWithRelations): ActivityType {
  // 1. 機械種類による判定（機械稼働費が優先）
  const machineName = reportItem.machine.name;
  
  // 部分一致で判定（より柔軟な判定）
  if (machineName.includes('1052')) {
    return 'M_1052';
  }
  if (machineName.includes('正面')) {
    return 'M_SHOMEN';
  }
  if (machineName.includes('12尺')) {
    return 'M_12SHAKU';
  }

  // 2. 実習生判定（isTraineeフラグ）
  const worker = reportItem.report.worker;
  if (worker.isTrainee) {
    return 'TRAINEE1';
  }

  // 3. デフォルトは通常作業
  return 'NORMAL';
}

/**
 * アクティビティコードから表示名を取得する
 */
export function getActivityName(activity: string): string {
  return ACTIVITY_NAMES[activity as ActivityType] || activity;
}

/**
 * アクティビティグループの型定義
 */
export interface ActivityGroup {
  activity: string;
  hours: number;
  items: ReportItemWithRelations[];
}

/**
 * レポートアイテムをアクティビティ別にグループ化する
 */
export function groupByActivity(
  reportItems: ReportItemWithRelations[],
  calculateHours: (item: ReportItemWithRelations) => number
): Map<string, ActivityGroup> {
  const activityMap = new Map<string, ActivityGroup>();

  reportItems.forEach((item) => {
    const activity = determineActivity(item);
    const hours = calculateHours(item);

    if (!activityMap.has(activity)) {
      activityMap.set(activity, {
        activity,
        hours: 0,
        items: [],
      });
    }

    const activityData = activityMap.get(activity)!;
    activityData.hours += hours;
    activityData.items.push(item);
  });

  return activityMap;
}

