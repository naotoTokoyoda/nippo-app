import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker/locale/ja';

const prisma = new PrismaClient();

// テストデータの設定
const CONFIG = {
  users: 10,           // 作業者数
  customers: 50,       // 客先数
  machines: 20,        // 機械種類数
  workOrders: 200,     // 工番数
  reports: 1000,       // 日報数
  reportItemsPerReport: 5, // 1日報あたりの作業項目数
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
  const users = [];
  for (let i = 0; i < CONFIG.users; i++) {
    users.push({
      name: faker.person.fullName(),
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
    'NC旋盤', 'マシニングセンター', 'ボール盤', 'フライス盤', '研削盤',
    '放電加工機', 'レーザー加工機', '溶接機', 'プレス機', '射出成形機',
    '3Dプリンター', 'レーザー切断機', '折り曲げ機', 'せん断機', 'タップ加工機',
    'リーマー加工機', 'ホーニング加工機', 'ラッピング加工機', 'バフ研磨機', '超音波洗浄機'
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
  const startDate = new Date('2023-01-01');
  const endDate = new Date('2024-12-31');
  
  // 既存の組み合わせを追跡するためのSet
  const existingCombinations = new Set<string>();
  
  for (let i = 0; i < CONFIG.reports; i++) {
    let randomDate: Date;
    let randomUser: User;
    let combinationKey: string;
    
    // 重複しない組み合わせを見つけるまで繰り返す
    let attempts = 0;
    do {
      randomDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
      randomUser = users[Math.floor(Math.random() * users.length)];
      combinationKey = `${randomDate.toISOString().split('T')[0]}-${randomUser.id}`;
      attempts++;
      
      // 無限ループを防ぐ
      if (attempts > 1000) {
        console.log('⚠️ 重複しない組み合わせが見つからないため、日報数を調整します');
        break;
      }
    } while (existingCombinations.has(combinationKey));
    
    // 組み合わせが見つかった場合のみ追加
    if (!existingCombinations.has(combinationKey)) {
      existingCombinations.add(combinationKey);
      
      reports.push({
        date: randomDate,
        workerId: randomUser.id,
        submittedAt: new Date(randomDate.getTime() + Math.random() * 24 * 60 * 60 * 1000), // 同日のランダムな時間
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
