import { DailyReportData, WorkItemData } from '@/types/daily-report';

// スプレッドシートの行データの型定義
export interface SpreadsheetRow {
  date: string;
  workerName: string;
  customerName: string;
  workNumberFront: string;
  workNumberBack: string;
  workName: string;
  startTime: string;
  endTime: string;
  machineType: string;
  workStatus?: string;
  remarks?: string;
}

// スプレッドシートデータを日報データに変換する関数
export function convertSpreadsheetToDailyReports(rows: SpreadsheetRow[]): DailyReportData[] {
  const reportsMap = new Map<string, DailyReportData>();

  for (const row of rows) {
    const reportKey = `${row.date}-${row.workerName}`;
    
    if (!reportsMap.has(reportKey)) {
      // 新しい日報を作成
      reportsMap.set(reportKey, {
        id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        date: row.date,
        workerName: row.workerName,
        workItems: [],
        submittedAt: new Date().toISOString()
      });
    }

    const report = reportsMap.get(reportKey)!;
    
    // 作業項目を作成
    const workItem: WorkItemData = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      customerName: row.customerName,
      workNumberFront: row.workNumberFront,
      workNumberBack: row.workNumberBack,
      name: row.workName,
      startTime: row.startTime,
      endTime: row.endTime,
      machineType: row.machineType,
      workStatus: row.workStatus,
      remarks: row.remarks || ''
    };

    report.workItems.push(workItem);
  }

  return Array.from(reportsMap.values());
}

// CSVデータをパースする関数
export function parseCSVData(csvContent: string): SpreadsheetRow[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const rows: SpreadsheetRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    // 必須フィールドの検証
    if (row.date && row.workerName && row.customerName && row.workName) {
      rows.push({
        date: row.date,
        workerName: row.workerName,
        customerName: row.customerName,
        workNumberFront: row.workNumberFront || '',
        workNumberBack: row.workNumberBack || '',
        workName: row.workName,
        startTime: row.startTime || '08:00',
        endTime: row.endTime || '17:00',
        machineType: row.machineType || '該当なし',
        workStatus: row.workStatus,
        remarks: row.remarks
      });
    }
  }

  return rows;
}

// データ検証関数
export function validateSpreadsheetData(rows: SpreadsheetRow[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // ヘッダー行を考慮

    // 必須フィールドのチェック
    if (!row.date) {
      errors.push(`行${rowNumber}: 日付が入力されていません`);
    }
    if (!row.workerName) {
      errors.push(`行${rowNumber}: 作業者名が入力されていません`);
    }
    if (!row.customerName) {
      errors.push(`行${rowNumber}: 客先名が入力されていません`);
    }
    if (!row.workName) {
      errors.push(`行${rowNumber}: 作業名が入力されていません`);
    }

    // 時刻フォーマットのチェック
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (row.startTime && !timeRegex.test(row.startTime)) {
      errors.push(`行${rowNumber}: 開始時刻のフォーマットが正しくありません (HH:MM)`);
    }
    if (row.endTime && !timeRegex.test(row.endTime)) {
      errors.push(`行${rowNumber}: 終了時刻のフォーマットが正しくありません (HH:MM)`);
    }

    // 日付フォーマットのチェック
    if (row.date && !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
      errors.push(`行${rowNumber}: 日付のフォーマットが正しくありません (YYYY-MM-DD)`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// サンプルCSVデータを生成する関数（テスト用）
export function generateSampleCSV(): string {
  return `date,workerName,customerName,workNumberFront,workNumberBack,workName,startTime,endTime,machineType,workStatus,remarks
2024-12-01,橋本正朗,㈱TMT,5927,13343,テーパープラグ,08:00,12:00,スマート250 L : NC旋盤,normal,
2024-12-01,橋本正朗,㈱TMT,5927,13278,スリーブ,13:00,17:00,350 : NC旋盤マザック,normal,
2024-12-02,常世田博,㈱天昌電機社,5927,13314,ピン,08:00,14:00,250 : NC旋盤マザック,lunch_overtime,昼残
2024-12-02,常世田博,伊豆山,5927,13339,カップリング,14:00,17:00,MILLAC 1052 VII,normal,`;
}
