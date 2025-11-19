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

    // 2. 機械データを作成（本番環境の機械種類）
    console.log('🔧 機械データを作成中...');
    const machineNames = [
      'MILLAC 1052 VII',
      'MILLAC 761 VII',
      '250 : NC旋盤マザック',
      '350 : NC旋盤マザック',
      'スマート250 L : NC旋盤',
      'Mazak REX',
      'Mazatrol M-32',
      '正面盤 : Chubu LF 500',
      '12尺 : 汎用旋盤',
      '汎用旋盤',
      '溶接',
      '該当なし',
    ];

    const machines = await Promise.all(
      machineNames.map(name => 
        prisma.machine.create({
          data: {
            name,
            isActive: true,
          }
        })
      )
    );
    console.log(`✅ 機械 ${machines.length}台を作成しました`);

    // 3. 作業者データを作成（WORKER_OPTIONSから）
    console.log('👤 作業者データを作成中...');
    const workerNames = [
      '橋本正朗',
      '常世田博',
      '野城喜幸',
      '三好耕平',
      '高梨純一',
      '（トン）シーワイ チャナラット',
      '（ポーン）テートシームアン タナーポーン',
      '（コー）ジャンペンペーン パッタウィ',
    ];
    
    const workers = await Promise.all(
      workerNames.map(name => 
        prisma.user.create({
          data: { name }
        })
      )
    );
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

        // 各日、各作業者が1-4件の作業項目を作成（本番環境想定）
        const workItemsPerDay = Math.floor(Math.random() * 4) + 1; // 1-4件

        for (let item = 0; item < workItemsPerDay; item++) {
          const workOrder = workOrders[Math.floor(Math.random() * workOrders.length)];
          let machine;
          let workDescription;

          // 作業内容と機械を工番に応じて選択（本番環境の機械から選択）
          if (workOrder.backNumber.includes('J-')) {
            // JFE案件は正面盤メイン
            machine = machines.find(m => m.name === '正面盤 : Chubu LF 500') || machines[0];
            workDescription = '転炉ライニング作業';
          } else if (workOrder.description?.includes('溶射')) {
            // 溶射案件
            machine = machines.find(m => m.name === '溶接') || machines[0];
            workDescription = 'ロール表面溶射作業';
          } else if (workOrder.description?.includes('精密')) {
            // 精密加工案件
            machine = machines.find(m => m.name === 'MILLAC 1052 VII') || machines[0];
            workDescription = 'シャフト精密加工';
          } else if (day % 3 === 0 && item === workItemsPerDay - 1) {
            // 検品作業（3日に1回、最後の作業項目）
            machine = machines.find(m => m.name === '汎用旋盤') || machines[0];
            workDescription = '検品作業';
          } else {
            // 通常作業（全機械からランダム選択）
            machine = machines[Math.floor(Math.random() * machines.length)];
            workDescription = workOrder.description || '設備メンテナンス';
          }

          // 作業時間を15分刻みでランダムに設定（本番環境想定）
          const startHour = 8 + Math.floor(Math.random() * 3); // 8-10時開始
          const workHoursInMinutes = 180 + Math.floor(Math.random() * 300); // 3-8時間（180-480分）
          const workHours = Math.round(workHoursInMinutes / 15) * 15 / 60; // 15分刻みに調整して時間に変換

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
    console.log('\n🎉 本番環境想定のテストデータの作成が完了しました！');
    console.log('\n📊 作成されたデータ:');
    console.log(`  👥 顧客: ${customers.length}社`);
    console.log(`  🔧 機械: ${machines.length}台（本番環境の機械種類）`);
    console.log(`  👤 作業者: ${workers.length}名（WORKER_OPTIONSから）`);
    console.log(`  📋 工番: ${workOrders.length}件`);
    console.log(`  📝 日報: ${totalReports}件（過去10日分）`);
    console.log(`  ⏰ 作業項目: ${totalReportItems}件（15分刻みの作業時間）`);
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
