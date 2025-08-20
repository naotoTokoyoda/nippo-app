import { WORK_STATUS_OPTIONS } from '@/types/daily-report';
import dayjs from 'dayjs';

/**
 * 作業時間を計算する（昼休憩時間を考慮）
 * @param startTime 開始時間 (HH:MM 形式)
 * @param endTime 終了時間 (HH:MM 形式)
 * @param workStatus 勤務状況
 * @returns 作業時間（時間単位）
 */
export function calculateWorkTime(startTime: string, endTime: string, workStatus?: string): number {
  if (!startTime || !endTime) return 0;

  // 時間をDateオブジェクトに変換
  const start = new Date(`2000-01-01T${startTime}:00`);
  const end = new Date(`2000-01-01T${endTime}:00`);

  // 終了時間が開始時間より前の場合は日をまたいでいると仮定
  if (end < start) {
    end.setDate(end.getDate() + 1);
  }

  // 昼休憩時間の定義
  const lunchStart = new Date(`2000-01-01T12:00:00`);
  const lunchEnd = new Date(`2000-01-01T13:00:00`);

  // 昼休憩時間をまたぐかチェック
  const crossesLunch = start < lunchStart && end > lunchEnd;
  
  // 昼残の場合は昼休憩を差し引かない
  const hasLunchOvertime = workStatus === 'lunch_overtime';

  // 基本の作業時間を計算（ミリ秒）
  let workTimeMs = end.getTime() - start.getTime();

  // 昼休憩時間をまたぐ場合の処理
  if (crossesLunch && !hasLunchOvertime) {
    // 昼休憩時間（1時間）を差し引く
    workTimeMs -= 60 * 60 * 1000; // 1時間 = 60分 * 60秒 * 1000ミリ秒
  }

  // 時間単位に変換
  const workTimeHours = workTimeMs / (1000 * 60 * 60);

  return Math.max(0, workTimeHours); // 負の値にならないように
}

/**
 * 勤務状況の表示名を取得する関数
 * @param workStatus 勤務状況の値
 * @returns 表示名
 */
export function getWorkStatusLabel(workStatus?: string): string {
  if (!workStatus) return '通常';
  
  const statusOption = WORK_STATUS_OPTIONS.find(option => option.value === workStatus);
  return statusOption ? statusOption.label : '通常';
}

/**
 * 時間を時:分形式でフォーマット
 * @param hours 時間（小数点）
 * @returns 時:分形式の文字列
 */
export function formatTime(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * 時間を10進数形式でフォーマット
 * @param hours 時間（小数点）
 * @returns 10進数形式の文字列
 */
export function formatDecimalTime(hours: number): string {
  return hours.toFixed(2);
}

/**
 * 15分刻みの時間選択肢を生成
 * @param startHour 開始時間（時）
 * @param endHour 終了時間（時）
 * @returns 15分刻みの時間配列 (HH:MM 形式)
 */
export function generateTimeOptions(startHour: number = 0, endHour: number = 23): string[] {
  const options: string[] = [];
  
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      options.push(timeString);
    }
  }
  
  return options;
}

/**
 * 時間が15分刻みかどうかをチェック
 * @param time 時間文字列 (HH:MM 形式)
 * @returns 15分刻みの場合はtrue
 */
export function isValidTimeIncrement(time: string): boolean {
  if (!time) return true;
  
  const [, minutes] = time.split(':').map(Number);
  return minutes % 15 === 0;
}

/**
 * 作業時間が0分かどうかをチェック
 * @param startTime 開始時間 (HH:MM 形式)
 * @param endTime 終了時間 (HH:MM 形式)
 * @returns 作業時間が0分の場合はtrue
 */
export function isZeroWorkTime(startTime: string, endTime: string): boolean {
  if (!startTime || !endTime) return false;
  
  // 時間をDateオブジェクトに変換
  const start = new Date(`2000-01-01T${startTime}:00`);
  const end = new Date(`2000-01-01T${endTime}:00`);

  // 終了時間が開始時間より前の場合は日をまたいでいると仮定
  if (end < start) {
    end.setDate(end.getDate() + 1);
  }

  // 作業時間を計算（ミリ秒）
  const workTimeMs = end.getTime() - start.getTime();
  
  // 0分かどうかをチェック（1分未満を0分とみなす）
  return workTimeMs < 60 * 1000; // 1分 = 60秒 * 1000ミリ秒
}

/**
 * 日本時間（JST）で今日の日付をYYYY-MM-DD形式で取得
 * @returns 日本時間での今日の日付文字列
 */
export function getTodayInJST(): string {
  return dayjs().format('YYYY-MM-DD');
}

/**
 * 指定した日付をYYYY-MM-DD形式でフォーマット
 * @param date 日付（Date、dayjs、文字列など）
 * @returns YYYY-MM-DD形式の日付文字列
 */
export function formatDateToISO(date: Date | string | dayjs.Dayjs): string {
  return dayjs(date).format('YYYY-MM-DD');
}

/**
 * 指定した日付をHH:MM形式でフォーマット
 * @param date 日付（Date、dayjs、文字列など）
 * @returns HH:MM形式の時間文字列
 */
export function formatTimeToHHMM(date: Date | string | dayjs.Dayjs): string {
  return dayjs(date).format('HH:mm');
}

/**
 * 日本時間でのタイムスタンプを取得
 * @returns ISO形式のタイムスタンプ文字列
 */
export function getJSTTimestamp(): string {
  return dayjs().toISOString();
}

/**
 * 日付と時間文字列からJST基準のDateTimeを作成
 * @param date 日付文字列 (YYYY-MM-DD)
 * @param time 時間文字列 (HH:MM)
 * @returns UTC時間として保存するためのDateオブジェクト
 */
export function createJSTDateTime(date: string, time: string): Date {
  // 日本時間として解釈してUTC時間に変換
  return dayjs(`${date} ${time}`, 'YYYY-MM-DD HH:mm')
    .subtract(9, 'hour') // JST -> UTC変換
    .toDate();
}

/**
 * UTC時間として保存されているDateオブジェクトからJST時間文字列を取得
 * @param utcDate UTC時間として保存されているDateオブジェクト
 * @returns JST時間文字列 (HH:MM)
 */
export function formatUTCToJSTTime(utcDate: Date): string {
  return dayjs(utcDate)
    .add(9, 'hour') // UTC -> JST変換
    .format('HH:mm');
}

/**
 * 新しい仕様に基づいて作業時間を計算する
 * 1. 並行作業（同じ時刻の複数作業）: それぞれ独立してカウント
 * 2. 完全包含: 独立してカウント
 * 3. 部分重複: 重複部分を除去してマージ
 * @param workItems 作業項目の配列
 * @returns 計算された実際の作業時間（時間単位）
 */
export function calculateNonOverlappingWorkTime(workItems: Array<{
  startTime: string;
  endTime: string;
  workStatus?: string;
}>): number {
  if (!workItems || workItems.length === 0) return 0;

  // 個別の作業時間を先に計算
  const individualWorkTimes: Array<{
    start: number;
    end: number;
    workTime: number;
    workStatus?: string;
    index: number;
  }> = [];

  // 昼休憩時間の定義
  const lunchStart = new Date(`2000-01-01T12:00:00`).getTime();
  const lunchEnd = new Date(`2000-01-01T13:00:00`).getTime();
  const lunchDuration = 60 * 60 * 1000; // 1時間をミリ秒に変換

  workItems.forEach((item, index) => {
    if (!item.startTime || !item.endTime) return;

    const start = new Date(`2000-01-01T${item.startTime}:00`);
    const end = new Date(`2000-01-01T${item.endTime}:00`);
    
    // 終了時間が開始時間より前の場合は日をまたいでいると仮定
    if (end < start) {
      end.setDate(end.getDate() + 1);
    }

    const startMs = start.getTime();
    const endMs = end.getTime();
    let workTimeMs = endMs - startMs;

    // 昼休憩時間をまたぐかチェック
    const crossesLunch = startMs < lunchStart && endMs > lunchEnd;
    const hasLunchOvertime = item.workStatus === 'lunch_overtime';
    
    if (crossesLunch && !hasLunchOvertime) {
      workTimeMs -= lunchDuration;
    }

    individualWorkTimes.push({
      start: startMs,
      end: endMs,
      workTime: Math.max(0, workTimeMs / (1000 * 60 * 60)), // 時間単位
      workStatus: item.workStatus,
      index
    });
  });

  // 並行作業と包含関係の識別
  const processedIndices = new Set<number>();
  let totalHours = 0;

  for (let i = 0; i < individualWorkTimes.length; i++) {
    if (processedIndices.has(i)) continue;

    const currentWork = individualWorkTimes[i];
    const relatedWorks = [currentWork];
    processedIndices.add(i);

    // 同じ時刻または包含関係の作業を探す
    for (let j = i + 1; j < individualWorkTimes.length; j++) {
      if (processedIndices.has(j)) continue;

      const otherWork = individualWorkTimes[j];
      
      // 完全に同じ時刻（並行作業）
      const isSameTime = currentWork.start === otherWork.start && currentWork.end === otherWork.end;
      
      // 完全包含関係
      const isContained = 
        (currentWork.start <= otherWork.start && currentWork.end >= otherWork.end) ||
        (otherWork.start <= currentWork.start && otherWork.end >= currentWork.end);

      if (isSameTime || isContained) {
        relatedWorks.push(otherWork);
        processedIndices.add(j);
      }
    }

    // 並行作業・包含関係の場合は全て独立してカウント
    for (const work of relatedWorks) {
      totalHours += work.workTime;
    }
  }

  // 残りの作業（部分重複）を処理
  const remainingWorks = individualWorkTimes.filter((_, index) => !processedIndices.has(index));
  
  if (remainingWorks.length > 0) {
    // 部分重複をマージして処理
    remainingWorks.sort((a, b) => a.start - b.start);
    
    const mergedRanges: Array<{ start: number; end: number; hasLunchOvertime: boolean }> = [];
    
    for (const work of remainingWorks) {
      const hasLunchOvertime = work.workStatus === 'lunch_overtime';
      
      if (mergedRanges.length === 0) {
        mergedRanges.push({ 
          start: work.start, 
          end: work.end,
          hasLunchOvertime
        });
      } else {
        const lastRange = mergedRanges[mergedRanges.length - 1];
        
        // 重複している場合はマージ
        if (work.start <= lastRange.end) {
          lastRange.end = Math.max(lastRange.end, work.end);
          lastRange.hasLunchOvertime = lastRange.hasLunchOvertime || hasLunchOvertime;
        } else {
          // 重複していない場合は新しい範囲として追加
          mergedRanges.push({ 
            start: work.start, 
            end: work.end,
            hasLunchOvertime
          });
        }
      }
    }
    
    // マージされた範囲の時間を計算
    for (const range of mergedRanges) {
      let rangeTimeMs = range.end - range.start;
      
      const crossesLunch = range.start < lunchStart && range.end > lunchEnd;
      
      if (crossesLunch && !range.hasLunchOvertime) {
        rangeTimeMs -= lunchDuration;
      }
      
      totalHours += Math.max(0, rangeTimeMs / (1000 * 60 * 60));
    }
  }

  return totalHours;
} 