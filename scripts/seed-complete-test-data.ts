import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedCompleteTestData() {
  console.log('🌱 完全なテストデータを作成しています...');

  try {
    // 1. 顧客データを作成
    console.log('👥 顧客データを作成中...');
    const customers = await Promise.all([
      prisma.customer.create({
        data: {
          name: 'JFE製鉄株式会社',
          code: 'JFE001',
        }
      }),
      prisma.customer.create({
        data: {
          name: '新日本製鉄株式会社',
          code: 'NSC001',
        }
      }),
      prisma.customer.create({
        data: {
          name: '神戸製鋼所',
          code: 'KOB001',
        }
      }),
      prisma.customer.create({
        data: {
          name: '日新製鋼株式会社',
          code: 'NSS001',
        }
      }),
    ]);
    console.log(`✅ 顧客 ${customers.length}社を作成しました`);

    // 2. 機械データを作成
    console.log('🔧 機械データを作成中...');
    const machines = await Promise.all([
      prisma.machine.create({
        data: {
          name: 'MILLAC 1052 VII',
          category: 'NC旋盤',
        }
      }),
      prisma.machine.create({
        data: {
          name: '正面盤 : Chubu LF 500',
          category: '正面盤',
        }
      }),
      prisma.machine.create({
        data: {
          name: '12尺 : 汎用旋盤',
          category: '汎用旋盤',
        }
      }),
      prisma.machine.create({
        data: {
          name: '汎用旋盤',
          category: '汎用',
        }
      }),
      prisma.machine.create({
        data: {
          name: '溶接機',
          category: '溶接',
        }
      }),
    ]);
    console.log(`✅ 機械 ${machines.length}台を作成しました`);

    // 3. 作業者データを作成
    console.log('👤 作業者データを作成中...');
    const workers = await Promise.all([
      prisma.user.create({
        data: { name: '田中太郎' } // 通常作業者
      }),
      prisma.user.create({
        data: { name: '佐藤次郎' } // 通常作業者
      }),
      prisma.user.create({
        data: { name: 'ヤマダタロウ' } // 実習生（カタカナ）
      }),
      prisma.user.create({
        data: { name: 'サトウジロウ' } // 実習生（カタカナ）
      }),
    ]);
    console.log(`✅ 作業者 ${workers.length}名を作成しました`);

    // 4. 工番データを作成（5案件）
    console.log('📋 工番データを作成中...');
    const workOrders = await Promise.all([
      // 案件1: 59期 - 高炉設備メンテナンス
      prisma.workOrder.create({
        data: {
          frontNumber: '5927',
          backNumber: '10001',
          description: '高炉設備メンテナンス',
          customerId: customers[0].id, // JFE製鉄
          term: '59期',
          status: 'aggregating',
          projectName: '高炉設備定期点検・修理作業',
          handling: '定期保守',
          quantity: 1,
        }
      }),
      // 案件2: 59期-JFE - 転炉修理
      prisma.workOrder.create({
        data: {
          frontNumber: '5927',
          backNumber: 'J-501',
          description: '転炉修理作業',
          customerId: customers[0].id, // JFE製鉄
          term: '59期-JFE',
          status: 'aggregating',
          projectName: '転炉ライニング修理',
          handling: '緊急対応',
          quantity: 2,
        }
      }),
      // 案件3: 59期 - 圧延機改修
      prisma.workOrder.create({
        data: {
          frontNumber: '5927',
          backNumber: '10002',
          description: '圧延機改修工事',
          customerId: customers[1].id, // 新日本製鉄
          term: '59期',
          status: 'aggregating',
          projectName: '熱間圧延機改修作業',
          handling: '改修工事',
          quantity: 1,
        }
      }),
      // 案件4: 59期 - 溶射作業
      prisma.workOrder.create({
        data: {
          frontNumber: '5927',
          backNumber: '10003',
          description: '溶射作業一式',
          customerId: customers[2].id, // 神戸製鋼所
          term: '59期',
          status: 'aggregating',
          projectName: 'ロール表面溶射処理',
          handling: '表面処理',
          quantity: 5,
        }
      }),
      // 案件5: 59期 - 精密加工
      prisma.workOrder.create({
        data: {
          frontNumber: '5927',
          backNumber: '10004',
          description: '精密加工作業',
          customerId: customers[3].id, // 日新製鋼
          term: '59期',
          status: 'aggregating',
          projectName: 'シャフト精密加工',
          handling: '精密加工',
          quantity: 3,
        }
      }),
    ]);
    console.log(`✅ 工番 ${workOrders.length}件を作成しました`);

    // 5. 日報データを作成（過去10日分）
    console.log('📝 日報データを作成中...');
    // 現在の月の15日からデータを作成
    const now = new Date();
    const baseDate = new Date(now.getFullYear(), now.getMonth(), 15);
    let totalReports = 0;
    let totalReportItems = 0;

    for (let day = 0; day < 10; day++) {
      const reportDate = new Date(baseDate);
      reportDate.setDate(baseDate.getDate() + day);

      // 各作業者の日報を作成
      for (const worker of workers) {
        const report = await prisma.report.create({
          data: {
            date: reportDate,
            workerId: worker.id,
            submittedAt: new Date(reportDate.getTime() + 18 * 60 * 60 * 1000), // 18時に提出
          }
        });
        totalReports++;

        // 各日、各作業者が2-3件の作業項目を作成
        const workItemsPerDay = Math.floor(Math.random() * 2) + 2; // 2-3件

        for (let item = 0; item < workItemsPerDay; item++) {
          const workOrder = workOrders[Math.floor(Math.random() * workOrders.length)];
          let machine;
          let workDescription;

          // 作業内容と機械を工番に応じて選択
          if (workOrder.backNumber.includes('J-')) {
            // JFE案件は正面盤メイン
            machine = machines[1]; // 正面盤
            workDescription = '転炉ライニング作業';
          } else if (workOrder.description?.includes('溶射')) {
            // 溶射案件
            machine = machines[4]; // 溶接機
            workDescription = 'ロール表面溶射作業';
          } else if (workOrder.description?.includes('精密')) {
            // 精密加工案件
            machine = machines[0]; // MILLAC 1052
            workDescription = 'シャフト精密加工';
          } else if (day % 3 === 0 && item === workItemsPerDay - 1) {
            // 検品作業（3日に1回、最後の作業項目）
            machine = machines[3]; // 汎用旋盤
            workDescription = '検品作業';
          } else {
            // 通常作業
            machine = machines[Math.floor(Math.random() * 3)]; // 最初の3台からランダム
            workDescription = workOrder.description || '設備メンテナンス';
          }

          // 作業時間をランダムに設定（4-8時間）
          const startHour = 9 + Math.floor(Math.random() * 2); // 9-10時開始
          const workHours = 4 + Math.floor(Math.random() * 4); // 4-7時間

          await prisma.reportItem.create({
            data: {
              reportId: report.id,
              customerId: workOrder.customerId,
              workOrderId: workOrder.id,
              machineId: machine.id,
              startTime: new Date(reportDate.getTime() + startHour * 60 * 60 * 1000),
              endTime: new Date(reportDate.getTime() + (startHour + workHours) * 60 * 60 * 1000),
              workStatus: 'normal',
              workDescription,
              remarks: '正常完了',
            }
          });
          totalReportItems++;
        }
      }
    }
    console.log(`✅ 日報 ${totalReports}件、作業項目 ${totalReportItems}件を作成しました`);

    // 6. サンプル調整データを作成
    console.log('⚙️ 調整データを作成中...');
    await prisma.adjustment.create({
      data: {
        workOrderId: workOrders[1].id, // JFE案件
        type: 'trainee_discount',
        amount: -50000,
        reason: '実習生作業効率調整',
        memo: '実習生が含まれるため単価調整',
        createdBy: workers[0].id,
      }
    });
    console.log('✅ 調整データ 1件を作成しました');

    // 完了レポート
    console.log('\n🎉 完全なテストデータの作成が完了しました！');
    console.log('\n📊 作成されたデータ:');
    console.log(`  👥 顧客: ${customers.length}社`);
    console.log(`  🔧 機械: ${machines.length}台`);
    console.log(`  👤 作業者: ${workers.length}名`);
    console.log(`  📋 工番: ${workOrders.length}件`);
    console.log(`  📝 日報: ${totalReports}件`);
    console.log(`  ⏰ 作業項目: ${totalReportItems}件`);
    console.log(`  ⚙️ 調整: 1件`);

    console.log('\n📋 作成された工番一覧:');
    workOrders.forEach((wo, index) => {
      const customer = customers.find(c => c.id === wo.customerId);
      console.log(`  ${index + 1}. ${wo.frontNumber}-${wo.backNumber} | ${customer?.name} | ${wo.projectName}`);
    });

    console.log('\n✨ http://localhost:3000/aggregation で確認できます');

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

async function main() {
  try {
    await seedCompleteTestData();
  } catch (error) {
    console.error('❌ メインエラー:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
