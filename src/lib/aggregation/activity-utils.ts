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
 */
export const ACTIVITY_NAMES: Record<ActivityType, string> = {
  'NORMAL': '通常',
  'TRAINEE1': '1号実習生', 
  'INSPECTION': '検品',
  'M_1052': '1052',
  'M_SHOMEN': '正面盤',
  'M_12SHAKU': '12尺',
};

/**
 * レポートアイテムからアクティビティを判定する
 * 
 * 判定ロジック：
 * 1. 作業者名がカタカナ → 実習生
 * 2. 作業内容に「検品」を含む → 検品
 * 3. 機械種類による判定
 * 4. デフォルト → 通常作業
 */
export function determineActivity(reportItem: ReportItemWithRelations): ActivityType {
  // 1. 実習生判定（作業者名がカタカナ）
  const workerName = reportItem.report.worker.name;
  if (/^[\u30A0-\u30FF\s]+$/.test(workerName)) {
    return 'TRAINEE1';
  }

  // 2. 検品判定（作業内容に「検品」が含まれる）
  const workDescription = reportItem.workDescription || '';
  if (workDescription.includes('検品')) {
    return 'INSPECTION';
  }

  // 3. 機械種類による判定
  const machineName = reportItem.machine.name;
  if (machineName === 'MILLAC 1052 VII') {
    return 'M_1052';
  }
  if (machineName === '正面盤 : Chubu LF 500') {
    return 'M_SHOMEN';
  }
  if (machineName === '12尺 : 汎用旋盤') {
    return 'M_12SHAKU';
  }

  // 4. デフォルトは通常作業
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

