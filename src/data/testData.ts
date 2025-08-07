import { DailyReportData } from '@/components/DailyReport';

// 作業者データ（将来的にはusersテーブル）
export const WORKER_DATA = [
  { id: '1', name: '橋本正朗' },
  { id: '2', name: '常世田博' },
  { id: '3', name: '野城喜幸' },
  { id: '4', name: '三好耕平' },
  { id: '5', name: '高梨純一' },
  { id: '6', name: '金谷晶子' },
  { id: '7', name: '（トン）シーワイ チャナラット' },
  { id: '8', name: '（ポーン）テートシームアン タナーポーン' },
  { id: '9', name: '（コー）ジャンペンペーン パッタウィ' }
];

// 客先データ（将来的にはcustomersテーブル）
export const CUSTOMER_DATA = [
  { id: '1', name: '㈱TMT', code: 'TMT001' },
  { id: '2', name: 'クオール市原', code: 'QUR002' },
  { id: '3', name: '㈱天昌電機社', code: 'TEN003' },
  { id: '4', name: '伊豆山', code: 'IZU004' },
  { id: '5', name: '㈱伊豆山造船所', code: 'IZU005' },
  { id: '6', name: '㈱五光', code: 'GOK006' },
  { id: '7', name: '㈱三友鋼機', code: 'SAN007' }
];

// 機械種類データ（将来的にはmachinesテーブル）
export const MACHINE_DATA = [
  { id: '1', name: 'MILLAC 1052 VII', category: 'NCフライス盤' },
  { id: '2', name: 'MILLAC 761 VII', category: 'NCフライス盤' },
  { id: '3', name: '250 : NC旋盤マザック', category: 'NC旋盤' },
  { id: '4', name: '350 : NC旋盤マザック', category: 'NC旋盤' },
  { id: '5', name: 'スマート250 L : NC旋盤', category: 'NC旋盤' },
  { id: '6', name: 'Mazak REX', category: 'NC旋盤' },
  { id: '7', name: 'Mazatrol M-32', category: 'NC旋盤' },
  { id: '8', name: '正面盤 : Chubu LF 500', category: 'フライス盤' },
  { id: '9', name: '12尺 : 汎用旋盤', category: '旋盤' },
  { id: '10', name: '汎用旋盤', category: '旋盤' },
  { id: '11', name: '溶接', category: '溶接' },
  { id: '12', name: '該当なし', category: 'その他' }
];

// 工番データ（将来的にはworkOrdersテーブル）
export const WORK_ORDER_DATA = [
  { id: '1', frontNumber: '5927', backNumber: '13343', description: 'テーパープラグ', customerId: '1' },
  { id: '2', frontNumber: '5927', backNumber: '13278', description: 'スリーブ', customerId: '1' },
  { id: '3', frontNumber: '5927', backNumber: '13314', description: 'ピン', customerId: '3' },
  { id: '4', frontNumber: '5927', backNumber: '13339', description: 'カップリング', customerId: '4' },
  { id: '5', frontNumber: '5927', backNumber: '13264', description: '舵取り部品加工 ピン製作', customerId: '5' },
  { id: '6', frontNumber: '5927', backNumber: '13345', description: '多孔板', customerId: '6' },
  { id: '7', frontNumber: '5927', backNumber: '13262', description: 'フランジのネジ', customerId: '7' },
  { id: '8', frontNumber: '5927', backNumber: '13324', description: 'スタッドボルト', customerId: '1' },
  { id: '9', frontNumber: '5927', backNumber: '13279', description: 'カラー', customerId: '3' },
  { id: '10', frontNumber: '6028', backNumber: '14001', description: '新製品A', customerId: '1' },
  { id: '11', frontNumber: '6028', backNumber: '14002', description: '新製品B', customerId: '2' },
  { id: '12', frontNumber: '6129', backNumber: '15001', description: '次期製品X', customerId: '1' },
  { id: '13', frontNumber: '6129', backNumber: '15002', description: '次期製品Y', customerId: '3' }
];

// サンプル日報データ（将来的にはreportsテーブル）
export const SAMPLE_REPORTS: DailyReportData[] = [
  {
    id: '1',
    date: '2025-01-15',
    workerName: '橋本正朗',
    workItems: [
      {
        id: '1-1',
        customerName: '㈱TMT',
        workNumberFront: '5927',
        workNumberBack: '13343',
        name: 'テーパープラグ',
        startTime: '08:00',
        endTime: '12:00',
        machineType: 'スマート250 L : NC旋盤',
        remarks: ''
      },
      {
        id: '1-2',
        customerName: '㈱TMT',
        workNumberFront: '5927',
        workNumberBack: '13278',
        name: 'スリーブ',
        startTime: '13:00',
        endTime: '17:00',
        machineType: '350 : NC旋盤マザック',
        remarks: ''
      }
    ],
    submittedAt: '2025-01-15T17:30:00Z'
  },
  {
    id: '2',
    date: '2025-01-15',
    workerName: '常世田博',
    workItems: [
      {
        id: '2-1',
        customerName: '㈱天昌電機社',
        workNumberFront: '5927',
        workNumberBack: '13314',
        name: 'ピン',
        startTime: '08:00',
        endTime: '14:00',
        machineType: '250 : NC旋盤マザック',
        remarks: '昼残'
      },
      {
        id: '2-2',
        customerName: '伊豆山',
        workNumberFront: '5927',
        workNumberBack: '13339',
        name: 'カップリング',
        startTime: '14:00',
        endTime: '17:00',
        machineType: 'MILLAC 1052 VII',
        remarks: ''
      }
    ],
    submittedAt: '2025-01-15T17:15:00Z'
  },
  {
    id: '3',
    date: '2025-01-16',
    workerName: '野城喜幸',
    workItems: [
      {
        id: '3-1',
        customerName: '㈱伊豆山造船所',
        workNumberFront: '5927',
        workNumberBack: '13264',
        name: '舵取り部品加工 ピン製作',
        startTime: '08:00',
        endTime: '12:00',
        machineType: 'MILLAC 761 VII',
        remarks: ''
      },
      {
        id: '3-2',
        customerName: '㈱五光',
        workNumberFront: '5927',
        workNumberBack: '13345',
        name: '多孔板',
        startTime: '13:00',
        endTime: '17:00',
        machineType: '12尺 : 汎用旋盤',
        remarks: ''
      }
    ],
    submittedAt: '2025-01-16T17:30:00Z'
  },
  {
    id: '4',
    date: '2025-01-16',
    workerName: '三好耕平',
    workItems: [
      {
        id: '4-1',
        customerName: '㈱三友鋼機',
        workNumberFront: '5927',
        workNumberBack: '13262',
        name: 'フランジのネジ',
        startTime: '08:00',
        endTime: '11:30',
        machineType: '正面盤 : Chubu LF 500',
        remarks: ''
      },
      {
        id: '4-2',
        customerName: '㈱TMT',
        workNumberFront: '6028',
        workNumberBack: '14001',
        name: '新製品A',
        startTime: '13:00',
        endTime: '17:00',
        machineType: '汎用旋盤',
        remarks: ''
      }
    ],
    submittedAt: '2025-01-16T17:00:00Z'
  },
  {
    id: '5',
    date: '2025-01-17',
    workerName: '高梨純一',
    workItems: [
      {
        id: '5-1',
        customerName: 'クオール市原',
        workNumberFront: '6028',
        workNumberBack: '14002',
        name: '新製品B',
        startTime: '08:00',
        endTime: '12:00',
        machineType: 'MILLAC 1052 VII',
        remarks: '試作'
      },
      {
        id: '5-2',
        customerName: '㈱天昌電機社',
        workNumberFront: '6129',
        workNumberBack: '15001',
        name: '次期製品X',
        startTime: '13:00',
        endTime: '17:00',
        machineType: 'MILLAC 761 VII',
        remarks: ''
      }
    ],
    submittedAt: '2025-01-17T17:30:00Z'
  }
];

// データベース移行用のヘルパー関数
export const dataHelpers = {
  // 作業者名からIDを取得
  getWorkerId: (name: string) => {
    const worker = WORKER_DATA.find(w => w.name === name);
    return worker?.id || null;
  },

  // 客先名からIDを取得
  getCustomerId: (name: string) => {
    const customer = CUSTOMER_DATA.find(c => c.name === name);
    return customer?.id || null;
  },

  // 機械種類名からIDを取得
  getMachineId: (name: string) => {
    const machine = MACHINE_DATA.find(m => m.name === name);
    return machine?.id || null;
  },

  // 工番から工番IDを取得
  getWorkOrderId: (frontNumber: string, backNumber: string) => {
    const workOrder = WORK_ORDER_DATA.find(w => 
      w.frontNumber === frontNumber && w.backNumber === backNumber
    );
    return workOrder?.id || null;
  },

  // 日報データをデータベース形式に変換
  convertToDatabaseFormat: (report: DailyReportData) => {
    return {
      id: report.id,
      date: report.date,
      worker_id: dataHelpers.getWorkerId(report.workerName),
      submitted_at: report.submittedAt,
      work_items: report.workItems.map(item => ({
        id: item.id,
        customer_id: dataHelpers.getCustomerId(item.customerName),
        work_order_id: dataHelpers.getWorkOrderId(item.workNumberFront, item.workNumberBack),
        machine_id: dataHelpers.getMachineId(item.machineType),
        start_time: item.startTime,
        end_time: item.endTime,
        remarks: item.remarks
      }))
    };
  }
};
