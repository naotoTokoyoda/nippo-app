import { PrismaClient } from '@prisma/client';
import { getDeliveredTasks } from '../src/lib/jooto-api';

const prisma = new PrismaClient();

/**
 * Jooto APIから実際のタスクデータを取得して本番想定の日報データを作成するスクリプト
 * 
 * 作成されるデータ:
 * - 顧客: Jootoタスクから取得
 * - 工番: Jootoタスクの工番情報から作成
 * - 日報: 過去30日分のリアルな日報データ
 * - 作業項目: 工番に基づいた作業内容
 * - 作業者: 既存のテストユーザーを使用
 */

async function seedJootoProductionData() {
  console.log('🌱 Jooto APIから本番想定のデータを作成しています...');

  try {
    // 1. 既存のテストデータをクリア
    console.log('🗑️ 既存データをクリア中...');
    await prisma.adjustment.deleteMany();
    await prisma.reportItem.deleteMany();
    await prisma.report.deleteMany();
    await prisma.workOrder.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.rate.deleteMany();
    console.log('✅ 既存データをクリアしました');

    // 2. 基本単価データを作成
    console.log('💰 基本単価データを作成中...');
    const rates = [
      {
        activity: 'NORMAL',
        effectiveFrom: new Date('2024-01-01'),
        effectiveTo: null,
        costRate: 11000,
        billRate: 11000,
      },
      {
        activity: 'TRAINEE1',
        effectiveFrom: new Date('2024-01-01'),
        effectiveTo: null,
        costRate: 11000,
        billRate: 11000,
      },
      {
        activity: 'INSPECTION',
        effectiveFrom: new Date('2024-01-01'),
        effectiveTo: null,
        costRate: 11000,
        billRate: 11000,
      },
      {
        activity: 'M_1052',
        effectiveFrom: new Date('2024-01-01'),
        effectiveTo: null,
        costRate: 13000,
        billRate: 13000,
      },
      {
        activity: 'M_SHOMEN',
        effectiveFrom: new Date('2024-01-01'),
        effectiveTo: null,
        costRate: 13000,
        billRate: 13000,
      },
      {
        activity: 'M_12SHAKU',
        effectiveFrom: new Date('2024-01-01'),
        effectiveTo: null,
        costRate: 13000,
        billRate: 13000,
      },
    ];

    for (const rate of rates) {
      await prisma.rate.create({ data: rate });
    }
    console.log('✅ 基本単価データを作成しました');

    // 3. 機械データを作成
    console.log('🔧 機械データを作成中...');
    const machines = await Promise.all([
      prisma.machine.create({
        data: { name: 'MILLAC 1052 VII', isActive: true }
      }),
      prisma.machine.create({
        data: { name: '正面盤 : Chubu LF 500', isActive: true }
      }),
      prisma.machine.create({
        data: { name: '12尺 : 汎用旋盤', isActive: true }
      }),
      prisma.machine.create({
        data: { name: '汎用旋盤', isActive: true }
      }),
      prisma.machine.create({
        data: { name: '溶接機', isActive: true }
      }),
    ]);
    console.log(`✅ 機械 ${machines.length}台を作成しました`);

    // 4. 作業者データを作成
    console.log('👤 作業者データを作成中...');
    const workers = await Promise.all([
      prisma.user.create({ data: { name: '田中太郎' } }),
      prisma.user.create({ data: { name: '佐藤次郎' } }),
      prisma.user.create({ data: { name: 'ヤマダタロウ' } }),
      prisma.user.create({ data: { name: 'サトウジロウ' } }),
    ]);
    console.log(`✅ 作業者 ${workers.length}名を作成しました`);

    // 5. Jooto APIから納品済みタスクを取得
    console.log('📋 Jooto APIから納品済みタスクを取得中...');
    const deliveredTasks = await getDeliveredTasks();
    
    if (deliveredTasks.length === 0) {
      console.log('⚠️ Jooto APIからタスクが取得できませんでした。環境変数を確認してください。');
      console.log('📝 代替としてサンプルデータを作成します...');
      
      // 代替サンプルデータ
      const sampleCustomers = await Promise.all([
        prisma.customer.create({
          data: { name: 'JFE製鉄株式会社', code: 'JFE001' }
        }),
        prisma.customer.create({
          data: { name: '新日本製鉄株式会社', code: 'NSC001' }
        }),
        prisma.customer.create({
          data: { name: '神戸製鋼所', code: 'KOB001' }
        }),
      ]);

      const sampleWorkOrders = await Promise.all([
        prisma.workOrder.create({
          data: {
            frontNumber: '5927',
            backNumber: '10001',
            description: '高炉設備メンテナンス',
            customerId: sampleCustomers[0].id,
            term: '59期',
            status: 'aggregating',
            projectName: '高炉設備定期点検・修理作業',
            handling: '定期保守',
            quantity: 1,
          }
        }),
        prisma.workOrder.create({
          data: {
            frontNumber: '5927',
            backNumber: 'J-501',
            description: '転炉修理作業',
            customerId: sampleCustomers[0].id,
            term: '59期-JFE',
            status: 'aggregating',
            projectName: '転炉ライニング修理',
            handling: '緊急対応',
            quantity: 2,
          }
        }),
      ]);

      await createProductionReports(workers, machines, sampleWorkOrders);
      return;
    }

    console.log(`✅ Jooto APIから ${deliveredTasks.length}件のタスクを取得しました`);

    // 6. 顧客データを作成（Jootoタスクから）
    console.log('👥 顧客データを作成中...');
    const customerMap = new Map<string, any>();
    
    for (const task of deliveredTasks) {
      if (task.customerName && !customerMap.has(task.customerName)) {
        const customer = await prisma.customer.create({
          data: {
            name: task.customerName,
            code: task.customerName.substring(0, 10).replace(/[^A-Za-z0-9]/g, '') + '001',
          }
        });
        customerMap.set(task.customerName, customer);
      }
    }
    console.log(`✅ 顧客 ${customerMap.size}社を作成しました`);

    // 7. 工番データを作成（Jootoタスクから）
    console.log('📋 工番データを作成中...');
    const workOrders = [];
    
    for (const task of deliveredTasks) {
      if (task.workNumberFront && task.workNumberBack) {
        const customer = customerMap.get(task.customerName);
        if (customer) {
          const workOrder = await prisma.workOrder.create({
            data: {
              frontNumber: task.workNumberFront,
              backNumber: task.workNumberBack,
              description: task.workName || '作業内容未設定',
              customerId: customer.id,
              term: '59期',
              status: 'aggregating',
              projectName: task.workName || '作業内容未設定',
              handling: '通常作業',
              quantity: 1,
            }
          });
          workOrders.push(workOrder);
        }
      }
    }
    console.log(`✅ 工番 ${workOrders.length}件を作成しました`);

    // 8. 本番想定の日報データを作成
    console.log('📝 本番想定の日報データを作成中...');
    await createProductionReports(workers, machines, workOrders);

    console.log('\n🎉 Jooto APIベースの本番想定データの作成が完了しました！');
    console.log('\n📊 作成されたデータ:');
    console.log(`  👥 顧客: ${customerMap.size}社`);
    console.log(`  🔧 機械: ${machines.length}台`);
    console.log(`  👤 作業者: ${workers.length}名`);
    console.log(`  📋 工番: ${workOrders.length}件`);
    
    const reportCount = await prisma.report.count();
    const reportItemCount = await prisma.reportItem.count();
    console.log(`  📝 日報: ${reportCount}件`);
    console.log(`  ⏰ 作業項目: ${reportItemCount}件`);

    console.log('\n📋 作成された工番一覧:');
    for (const wo of workOrders.slice(0, 10)) { // 最初の10件を表示
      const customer = Array.from(customerMap.values()).find(c => c.id === wo.customerId);
      console.log(`  ${wo.frontNumber}-${wo.backNumber} | ${customer?.name} | ${wo.projectName}`);
    }
    if (workOrders.length > 10) {
      console.log(`  ... 他 ${workOrders.length - 10}件`);
    }

    console.log('\n✨ http://localhost:3000/aggregation で確認できます');

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

async function createProductionReports(workers: any[], machines: any[], workOrders: any[]) {
  // 過去30日分の日報を作成
  const now = new Date();
  const baseDate = new Date(now.getFullYear(), now.getMonth(), 1); // 今月の1日から開始
  let totalReports = 0;
  let totalReportItems = 0;

  // 作業日の設定（平日のみ）
  const workDays: Date[] = [];
  for (let day = 0; day < 30; day++) {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + day);
    const dayOfWeek = date.getDay();
    // 平日のみ（月曜日=1から金曜日=5）
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      workDays.push(date);
    }
  }

  console.log(`📅 ${workDays.length}日間の作業日で日報を作成します`);

  for (const workDate of workDays) {
    // 各作業者の日報を作成（80%の確率で出勤）
    for (const worker of workers) {
      if (Math.random() > 0.8) continue; // 20%の確率で欠勤

      const report = await prisma.report.create({
        data: {
          date: workDate,
          workerId: worker.id,
          submittedAt: new Date(workDate.getTime() + 18 * 60 * 60 * 1000), // 18時に提出
        }
      });
      totalReports++;

      // 各日、各作業者が1-4件の作業項目を作成
      const workItemsPerDay = Math.floor(Math.random() * 4) + 1; // 1-4件

      for (let item = 0; item < workItemsPerDay; item++) {
        const workOrder = workOrders[Math.floor(Math.random() * workOrders.length)];
        let machine;
        let workDescription;
        let activity = 'NORMAL';

        // 作業内容と機械を工番に応じて選択
        if (workOrder.backNumber.includes('J-')) {
          // JFE案件は正面盤メイン
          machine = machines[1]; // 正面盤
          workDescription = '転炉ライニング作業';
          activity = 'M_SHOMEN';
        } else if (workOrder.description?.includes('溶射') || workOrder.projectName?.includes('溶射')) {
          // 溶射案件
          machine = machines[4]; // 溶接機
          workDescription = 'ロール表面溶射作業';
          activity = 'M_SHOMEN';
        } else if (workOrder.description?.includes('精密') || workOrder.projectName?.includes('精密')) {
          // 精密加工案件
          machine = machines[0]; // MILLAC 1052
          workDescription = 'シャフト精密加工';
          activity = 'M_1052';
        } else if (Math.random() > 0.9) {
          // 10%の確率で検品作業
          machine = machines[3]; // 汎用旋盤
          workDescription = '検品作業';
          activity = 'INSPECTION';
        } else {
          // 通常作業
          const machineTypes = [machines[0], machines[1], machines[2]]; // 主要3台
          machine = machineTypes[Math.floor(Math.random() * machineTypes.length)];
          workDescription = workOrder.description || workOrder.projectName || '設備メンテナンス';
          
          // 機械に応じてアクティビティを設定
          if (machine.name.includes('1052')) activity = 'M_1052';
          else if (machine.name.includes('正面盤')) activity = 'M_SHOMEN';
          else if (machine.name.includes('12尺')) activity = 'M_12SHAKU';
          else activity = 'NORMAL';
        }

        // 実習生の判定（カタカナ名）
        if (worker.name.match(/[ァ-ヶ]/)) {
          activity = 'TRAINEE1';
        }

        // 作業時間をランダムに設定（2-8時間）
        const startHour = 8 + Math.floor(Math.random() * 2); // 8-9時開始
        const workHours = 2 + Math.floor(Math.random() * 6); // 2-7時間

        await prisma.reportItem.create({
          data: {
            reportId: report.id,
            customerId: workOrder.customerId,
            workOrderId: workOrder.id,
            machineId: machine.id,
            startTime: new Date(workDate.getTime() + startHour * 60 * 60 * 1000),
            endTime: new Date(workDate.getTime() + (startHour + workHours) * 60 * 60 * 1000),
            workStatus: 'normal',
            workDescription,
            remarks: '正常完了',
            activity,
          }
        });
        totalReportItems++;
      }
    }
  }

  console.log(`✅ 日報 ${totalReports}件、作業項目 ${totalReportItems}件を作成しました`);
}

async function main() {
  try {
    await seedJootoProductionData();
  } catch (error) {
    console.error('❌ メインエラー:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
