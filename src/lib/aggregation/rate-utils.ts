import { ActivitySummary, EditedRates, RateChange } from '@/types/aggregation';

/**
 * 活動の請求額情報
 */
export interface ActivityBillInfo {
  currentBillRate: number;
  currentBillAmount: number;
}

/**
 * 活動ごとの請求額マップ
 */
export type ActivityBillAmountMap = Record<string, ActivityBillInfo>;

/**
 * 活動ごとの請求額を計算する
 */
export function calculateActivityBillAmounts(
  activities: ActivitySummary[],
  editedRates: EditedRates
): ActivityBillAmountMap {
  return activities.reduce<ActivityBillAmountMap>((acc, activity) => {
    const editedRate = editedRates[activity.activity];
    const currentBillRate = editedRate ? parseInt(editedRate.billRate, 10) || activity.billRate : activity.billRate;
    const currentBillAmount = activity.hours * currentBillRate;
    acc[activity.activity] = {
      currentBillRate,
      currentBillAmount,
    };
    return acc;
  }, {});
}

/**
 * 労務費請求額の小計を計算する
 */
export function calculateBillLaborSubtotal(activityBillAmounts: ActivityBillAmountMap): number {
  return Object.values(activityBillAmounts).reduce((sum, info) => sum + info.currentBillAmount, 0);
}

/**
 * 調整額の合計を計算する
 */
export function calculateAdjustmentTotal(
  activities: ActivitySummary[],
  editedRates: EditedRates
): number {
  return activities.reduce((sum, activity) => {
    const editedRate = editedRates[activity.activity];

    if (editedRate) {
      const currentBillRate = parseInt(editedRate.billRate, 10) || 0;
      const originalBillRate = activity.billRate;
      const originalAmount = activity.hours * originalBillRate;
      const newAmount = activity.hours * currentBillRate;
      return sum + (newAmount - originalAmount);
    }

    return sum + activity.adjustment;
  }, 0);
}

/**
 * 単価変更を計算する
 */
export function calculateRateChanges(
  activities: ActivitySummary[],
  editedRates: EditedRates
): RateChange[] {
  return Object.entries(editedRates)
    .map(([activity, data]) => {
      const activityData = activities.find((a) => a.activity === activity);
      if (!activityData) {
        return null;
      }

      const oldRate = activityData.billRate;
      const newRate = parseInt(data.billRate, 10) || 0;
      const adjustment = (newRate - oldRate) * activityData.hours;

      return {
        activity,
        activityName: activityData.activityName,
        oldRate,
        newRate,
        memo: data.memo || '',
        hours: activityData.hours,
        adjustment,
      };
    })
    .filter(Boolean) as RateChange[];
}

/**
 * 単価変更があるかどうかを判定する
 */
export function hasRateChanges(rateChanges: RateChange[]): boolean {
  return rateChanges.length > 0;
}

/**
 * メモ変更があるかどうかを判定する（単価変更なしでメモのみ変更）
 */
export function hasMemoOnlyChanges(
  activities: ActivitySummary[],
  editedRates: EditedRates
): boolean {
  return activities.some(activity => {
    const editedRate = editedRates[activity.activity];
    if (!editedRate) return false;
    
    const rateChanged = parseInt(editedRate.billRate, 10) !== activity.billRate;
    const memoChanged = (editedRate.memo || '') !== (activity.memo || '');
    
    return memoChanged && !rateChanged;
  });
}

/**
 * 活動に編集されたメモを適用する
 */
export function applyEditedMemos(
  activities: ActivitySummary[],
  editedRates: EditedRates
): ActivitySummary[] {
  return activities.map(activity => ({
    ...activity,
    memo: editedRates[activity.activity]?.memo ?? activity.memo,
  }));
}

/**
 * 活動から初期の編集用単価データを作成する
 */
export function createInitialEditedRates(activities: ActivitySummary[]): EditedRates {
  const initialRates: EditedRates = {};
  activities.forEach((activity) => {
    initialRates[activity.activity] = {
      billRate: activity.billRate.toString(),
      memo: activity.memo ?? '',
    };
  });
  return initialRates;
}

/**
 * API送信用の調整データを作成する
 */
export function createAdjustmentsForAPI(
  editedRates: EditedRates,
  activities: ActivitySummary[]
): Record<string, { billRate: number; memo: string }> {
  const adjustmentsForAPI: Record<string, { billRate: number; memo: string }> = {};
  
  Object.entries(editedRates).forEach(([activity, data]) => {
    const originalBillRate = activities.find(a => a.activity === activity)?.billRate || 0;
    adjustmentsForAPI[activity] = {
      billRate: parseInt(data.billRate, 10) || originalBillRate,
      memo: data.memo || '',
    };
  });
  
  return adjustmentsForAPI;
}

