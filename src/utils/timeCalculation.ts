/**
 * 作業時間を計算する（昼休憩時間を考慮）
 * @param startTime 開始時間 (HH:MM 形式)
 * @param endTime 終了時間 (HH:MM 形式)
 * @param remarks 備考欄
 * @returns 作業時間（時間単位）
 */
export function calculateWorkTime(startTime: string, endTime: string, remarks: string = ''): number {
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
  
  // 備考欄に「昼残」が含まれているかチェック
  const hasLunchRemarks = remarks.includes('昼残');

  // 基本の作業時間を計算（ミリ秒）
  let workTimeMs = end.getTime() - start.getTime();

  // 昼休憩時間をまたぐ場合の処理
  if (crossesLunch && !hasLunchRemarks) {
    // 昼休憩時間（1時間）を差し引く
    workTimeMs -= 60 * 60 * 1000; // 1時間 = 60分 * 60秒 * 1000ミリ秒
  }

  // 時間単位に変換
  const workTimeHours = workTimeMs / (1000 * 60 * 60);

  return Math.max(0, workTimeHours); // 負の値にならないように
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
  
  const [hours, minutes] = time.split(':').map(Number);
  return minutes % 15 === 0;
} 