import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker/locale/ja';

const prisma = new PrismaClient();

// テストデータの設定
const CONFIG = {
  users: 8,            // 作業者数（実際の名前の数に合わせて修正）
  customers: 50,       // 客先数
  machines: 12,        // 機械種類数（実際の機械名の数に合わせて修正）
  workOrders: 200,     // 工番数
  reports: 1000,       // 日報数
  reportItemsPerReport: 5, // 1日報あたりの作業項目数
  // 本番導入を想定したデータ範囲
  startYear: 2024,     // 開始年
  endYear: 2025,       // 終了年
};

// 型定義
interface User {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
  code: string;
}

interface Machine {
  id: string;
  name: string;
  category: string;
}

interface WorkOrder {
  id: string;
  frontNumber: string;
  backNumber: string;
  description: string | null;
  customerId: string;
}

interface Report {
  id: string;
  date: Date;
  workerId: string;
  submittedAt: Date;
}

// 作業者データ
const generateUsers = () => {
  const actualNames = [
    '橋本正朗',
    '常世田博',
    '野城喜幸',
    '三好耕平',
    '高梨純一',
    '（トン）シーワイ チャナラット',
    '（ポーン）テートシームアン タナーポーン',
    '（コー）ジャンペンペーン パッタウィ',
  ];
  
  const users = [];
  for (let i = 0; i < actualNames.length; i++) {
    users.push({
      name: actualNames[i],
    });
  }
  return users;
};

// 客先データ
const generateCustomers = () => {
  const customers = [];
  for (let i = 0; i < CONFIG.customers; i++) {
    customers.push({
      name: faker.company.name(),
      code: faker.string.alphanumeric(8).toUpperCase(),
    });
  }
  return customers;
};

// 機械データ
const generateMachines = () => {
  const machineTypes = [
    'MILLAC 1052 VII', 'MILLAC 761 VII', '250：NC旋盤マザック', '350：NC旋盤マザック', '汎用旋盤',
    'スマート250 L：NC旋盤', 'Mazak REX', 'Mazatrol M-32', '正面盤：Chubu LF 500', '12尺：汎用旋盤',
    '溶接', '該当なし',
  ];
  
  const machines = [];
  for (let i = 0; i < CONFIG.machines; i++) {
    machines.push({
      name: machineTypes[i],
      category: machineTypes[i],
    });
  }
  return machines;
};

// 工番データ
const generateWorkOrders = (customers: Customer[]) => {
  const workOrders = [];
  for (let i = 0; i < CONFIG.workOrders; i++) {
    workOrders.push({
      frontNumber: faker.string.alphanumeric(6).toUpperCase(),
      backNumber: faker.string.alphanumeric(4).toUpperCase(),
      description: faker.commerce.productName(),
      customerId: customers[Math.floor(Math.random() * customers.length)].id,
    });
  }
  return workOrders;
};

// 日報データ
const generateReports = (users: User[]) => {
  const reports = [];
  const startDate = new Date(CONFIG.startYear, 0, 1); // 2024年1月1日
  const endDate = new Date(CONFIG.endYear, 11, 31);   // 2025年12月31日
  
  // 既存の組み合わせを追跡するためのSet
  const existingCombinations = new Set<string>();
  
  // 2024年と2025年のデータを配分（2024年: 60%, 2025年: 40%）
  const reports2024 = Math.floor(CONFIG.reports * 0.6);
  const reports2025 = CONFIG.reports - reports2024;
  
  // 2024年のデータ生成
  const startDate2024 = new Date(2024, 0, 1);
  const endDate2024 = new Date(2024, 11, 31);
  
  for (let i = 0; i < reports2024; i++) {
    let randomDate: Date;
    let randomUser: User;
    let combinationKey: string;
    
    let attempts = 0;
    do {
      // より確実な日付生成方法
      const startTime = startDate2024.getTime();
      const endTime = endDate2024.getTime();
      const randomTime = startTime + Math.random() * (endTime - startTime);
      randomDate = new Date(randomTime);
      
      // 日付を00:00:00に設定してタイムゾーンの影響を排除
      randomDate.setHours(0, 0, 0, 0);
      
      randomUser = users[Math.floor(Math.random() * users.length)];
      combinationKey = `${randomDate.toISOString().split('T')[0]}-${randomUser.id}`;
      attempts++;
      
      if (attempts > 1000) break;
    } while (existingCombinations.has(combinationKey));
    
    if (!existingCombinations.has(combinationKey)) {
      existingCombinations.add(combinationKey);
      
      reports.push({
        date: randomDate,
        workerId: randomUser.id,
        submittedAt: new Date(randomDate.getTime() + Math.random() * 24 * 60 * 60 * 1000),
      });
    }
  }
  
  // 2025年のデータ生成
  const startDate2025 = new Date(2025, 0, 1);
  const endDate2025 = new Date(2025, 11, 31);
  
  for (let i = 0; i < reports2025; i++) {
    let randomDate: Date;
    let randomUser: User;
    let combinationKey: string;
    
    let attempts = 0;
    do {
      // より確実な日付生成方法
      const startTime = startDate2025.getTime();
      const endTime = endDate2025.getTime();
      const randomTime = startTime + Math.random() * (endTime - startTime);
      randomDate = new Date(randomTime);
      
      // 日付を00:00:00に設定してタイムゾーンの影響を排除
      randomDate.setHours(0, 0, 0, 0);
      
      randomUser = users[Math.floor(Math.random() * users.length)];
      combinationKey = `${randomDate.toISOString().split('T')[0]}-${randomUser.id}`;
      attempts++;
      
      if (attempts > 1000) break;
    } while (existingCombinations.has(combinationKey));
    
    if (!existingCombinations.has(combinationKey)) {
      existingCombinations.add(combinationKey);
      
      reports.push({
        date: randomDate,
        workerId: randomUser.id,
        submittedAt: new Date(randomDate.getTime() + Math.random() * 24 * 60 * 60 * 1000),
      });
    }
  }
  
  return reports;
};

// 作業項目データ
const generateReportItems = (reports: Report[], workOrders: WorkOrder[], machines: Machine[]) => {
  const reportItems = [];
  
  for (const report of reports) {
    const itemsCount = Math.floor(Math.random() * CONFIG.reportItemsPerReport) + 1; // 1-5個の作業項目
    
    for (let i = 0; i < itemsCount; i++) {
      const randomWorkOrder = workOrders[Math.floor(Math.random() * workOrders.length)];
      const randomMachine = machines[Math.floor(Math.random() * machines.length)];
      
      // 作業時間を生成（8時間以内）
      const startHour = Math.floor(Math.random() * 8) + 8; // 8:00-16:00
      const startMinute = Math.floor(Math.random() * 60);
      const durationHours = Math.random() * 4 + 1; // 1-5時間
      const endHour = Math.min(17, startHour + Math.floor(durationHours));
      const endMinute = Math.floor(Math.random() * 60);
      
      const startTime = new Date(report.date);
      startTime.setHours(startHour, startMinute, 0, 0);
      
      const endTime = new Date(report.date);
      endTime.setHours(endHour, endMinute, 0, 0);
      
      reportItems.push({
        reportId: report.id,
        customerId: randomWorkOrder.customerId,
        workOrderId: randomWorkOrder.id,
        machineId: randomMachine.id,
        startTime,
        endTime,
        workStatus: ['normal', 'overtime', 'early_leave', 'late_arrival'][Math.floor(Math.random() * 4)],
        remarks: Math.random() > 0.7 ? faker.lorem.sentence() : null, // 30%の確率で備考あり
      });
    }
  }
  
  return reportItems;
};

// メイン処理
async function generateTestData() {
  console.log('🚀 テストデータの生成を開始します...');
  
  try {
    // 1. 作業者を生成
    console.log('📝 作業者データを生成中...');
    const users = await Promise.all(
      generateUsers().map(user => prisma.user.create({ data: user }))
    );
    console.log(`✅ ${users.length}人の作業者を作成しました`);
    
    // 2. 客先を生成
    console.log('🏢 客先データを生成中...');
    const customers = await Promise.all(
      generateCustomers().map(customer => prisma.customer.create({ data: customer }))
    );
    console.log(`✅ ${customers.length}社の客先を作成しました`);
    
    // 3. 機械を生成
    console.log('⚙️ 機械データを生成中...');
    const machines = await Promise.all(
      generateMachines().map(machine => prisma.machine.create({ data: machine }))
    );
    console.log(`✅ ${machines.length}種類の機械を作成しました`);
    
    // 4. 工番を生成
    console.log('🔧 工番データを生成中...');
    const workOrders = await Promise.all(
      generateWorkOrders(customers).map(workOrder => prisma.workOrder.create({ data: workOrder }))
    );
    console.log(`✅ ${workOrders.length}件の工番を作成しました`);
    
    // 5. 日報を生成
    console.log('📊 日報データを生成中...');
    const reportData = generateReports(users);
    
    // バッチ処理で日報を作成
    const reportBatchSize = 50;
    const reports = [];
    for (let i = 0; i < reportData.length; i += reportBatchSize) {
      const batch = reportData.slice(i, i + reportBatchSize);
      const batchResults = await Promise.all(
        batch.map(report => prisma.report.create({ data: report }))
      );
      reports.push(...batchResults);
      console.log(`📦 日報バッチ ${Math.floor(i / reportBatchSize) + 1}/${Math.ceil(reportData.length / reportBatchSize)} を処理中...`);
    }
    console.log(`✅ ${reports.length}件の日報を作成しました`);
    
    // 6. 作業項目を生成
    console.log('📋 作業項目データを生成中...');
    const reportItems = generateReportItems(reports, workOrders, machines);
    
    // バッチ処理で作業項目を作成
    const batchSize = 100;
    for (let i = 0; i < reportItems.length; i += batchSize) {
      const batch = reportItems.slice(i, i + batchSize);
      await prisma.reportItem.createMany({ data: batch });
      console.log(`📦 作業項目バッチ ${Math.floor(i / batchSize) + 1}/${Math.ceil(reportItems.length / batchSize)} を処理中...`);
    }
    
    console.log(`✅ ${reportItems.length}件の作業項目を作成しました`);
    
    // 統計情報を表示
    const stats = await prisma.$transaction([
      prisma.user.count(),
      prisma.customer.count(),
      prisma.machine.count(),
      prisma.workOrder.count(),
      prisma.report.count(),
      prisma.reportItem.count(),
    ]);
    
    console.log('\n🎉 テストデータの生成が完了しました！');
    console.log('📊 データベース統計:');
    console.log(`   - 作業者: ${stats[0]}人`);
    console.log(`   - 客先: ${stats[1]}社`);
    console.log(`   - 機械: ${stats[2]}種類`);
    console.log(`   - 工番: ${stats[3]}件`);
    console.log(`   - 日報: ${stats[4]}件`);
    console.log(`   - 作業項目: ${stats[5]}件`);
    console.log('\n📅 データ期間:');
    console.log(`   - 開始: ${CONFIG.startYear}年1月`);
    console.log(`   - 終了: ${CONFIG.endYear}年12月`);
    console.log(`   - 2024年: 約${Math.floor(CONFIG.reports * 0.6)}件`);
    console.log(`   - 2025年: 約${Math.floor(CONFIG.reports * 0.4)}件`);
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプト実行
if (require.main === module) {
  generateTestData();
}

export { generateTestData };