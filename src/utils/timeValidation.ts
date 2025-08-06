import { DailyReportData, WorkItemData } from '@/components/DailyReport';

export interface TimeContinuityCheck {
  isValid: boolean;
  message: string;
  suggestedStartTime?: string;
}

// 時間を分に変換
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// 分を時間形式に変換
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// 作業時間の継続性をチェック
export function checkTimeContinuity(
  currentStartTime: string,
  currentEndTime: string,
  workerName: string,
  reports: DailyReportData[],
  currentDate: string
): TimeContinuityCheck {
  // 同じ作業者の最新の投稿を取得
  const workerReports = reports
    .filter(report => report.workerName === workerName && report.date !== currentDate)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (workerReports.length === 0) {
    return {
      isValid: true,
      message: 'この作業者の前回投稿はありません'
    };
  }

  const latestReport = workerReports[0];
  const lastWorkItem = latestReport.workItems[latestReport.workItems.length - 1];
  
  if (!lastWorkItem.endTime) {
    return {
      isValid: true,
      message: '前回の作業終了時間が記録されていません'
    };
  }

  const lastEndMinutes = timeToMinutes(lastWorkItem.endTime);
  const currentStartMinutes = timeToMinutes(currentStartTime);
  const currentEndMinutes = timeToMinutes(currentEndTime);

  // 前回の終了時間と今回の開始時間の差を計算
  const timeGap = currentStartMinutes - lastEndMinutes;

  // 同じ日の場合のチェック
  if (latestReport.date === currentDate) {
    if (currentStartMinutes < lastEndMinutes) {
      return {
        isValid: false,
        message: `前回の作業終了時間(${lastWorkItem.endTime})より早い時間で開始しています`,
        suggestedStartTime: lastWorkItem.endTime
      };
    }
    
    if (timeGap > 60) { // 1時間以上の空白
      return {
        isValid: false,
        message: `前回の作業終了時間(${lastWorkItem.endTime})から1時間以上の空白があります`,
        suggestedStartTime: lastWorkItem.endTime
      };
    }
  } else {
    // 異なる日の場合
    if (currentStartMinutes < 480) { // 8:00より早い
      return {
        isValid: false,
        message: '作業開始時間が早すぎます（8:00以降に設定してください）',
        suggestedStartTime: '08:00'
      };
    }
  }



  return {
    isValid: true,
    message: '時間の継続性は正常です'
  };
}

// 1日の合計作業時間を計算
export function calculateTotalWorkTime(workItems: WorkItemData[]): number {
  return workItems.reduce((total, item) => {
    if (!item.startTime || !item.endTime) return total;
    const startMinutes = timeToMinutes(item.startTime);
    const endMinutes = timeToMinutes(item.endTime);
    const duration = endMinutes - startMinutes;
    
    // 昼残の場合は30分を差し引く
    if (item.remarks && item.remarks.includes('昼残')) {
      return total + Math.max(0, duration - 30);
    }
    
    return total + duration;
  }, 0);
}

// 8時間労働のチェック
export function checkEightHourWork(workItems: WorkItemData[]): {
  isValid: boolean;
  totalMinutes: number;
  message: string;
} {
  const totalMinutes = calculateTotalWorkTime(workItems);
  const requiredMinutes = 8 * 60; // 8時間 = 480分

  return {
    isValid: totalMinutes >= requiredMinutes,
    totalMinutes,
    message: totalMinutes >= requiredMinutes 
      ? `合計作業時間: ${Math.floor(totalMinutes / 60)}:${(totalMinutes % 60).toString().padStart(2, '0')} (${(totalMinutes / 60).toFixed(2)}時間)`
      : `合計作業時間が不足しています: ${Math.floor(totalMinutes / 60)}:${(totalMinutes % 60).toString().padStart(2, '0')} (${(totalMinutes / 60).toFixed(2)}時間) - 8時間必要`
  };
} 