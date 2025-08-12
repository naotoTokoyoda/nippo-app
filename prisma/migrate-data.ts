import { PrismaClient } from '@prisma/client';
import { 
  WORKER_DATA, 
  CUSTOMER_DATA, 
  MACHINE_DATA, 
  WORK_ORDER_DATA, 
  SAMPLE_REPORTS,
  dataHelpers 
} from '../src/data/testData';

const prisma = new PrismaClient();

async function migrateData() {
  console.log('🚀 データ移行を開始します...');

  try {
    // データベース接続テスト
    console.log('🔍 データベース接続を確認中...');
    await prisma.$connect();
    console.log('✅ データベース接続成功');

    // 1. 作業者データの移行
    console.log('📝 作業者データを移行中...');
    for (const worker of WORKER_DATA) {
      await prisma.user.upsert({
        where: { id: worker.id },
        update: { name: worker.name },
        create: { id: worker.id, name: worker.name }
      });
    }
    console.log(`✅ ${WORKER_DATA.length}件の作業者データを移行しました`);

    // 2. 客先データの移行
    console.log('🏢 客先データを移行中...');
    for (const customer of CUSTOMER_DATA) {
      await prisma.customer.upsert({
        where: { id: customer.id },
        update: { name: customer.name, code: customer.code },
        create: { id: customer.id, name: customer.name, code: customer.code }
      });
    }
    console.log(`✅ ${CUSTOMER_DATA.length}件の客先データを移行しました`);

    // 3. 機械データの移行
    console.log('🔧 機械データを移行中...');
    for (const machine of MACHINE_DATA) {
      await prisma.machine.upsert({
        where: { id: machine.id },
        update: { name: machine.name, category: machine.category },
        create: { id: machine.id, name: machine.name, category: machine.category }
      });
    }
    console.log(`✅ ${MACHINE_DATA.length}件の機械データを移行しました`);

    // 4. 工番データの移行
    console.log('📋 工番データを移行中...');
    for (const workOrder of WORK_ORDER_DATA) {
      await prisma.workOrder.upsert({
        where: { id: workOrder.id },
        update: {
          frontNumber: workOrder.frontNumber,
          backNumber: workOrder.backNumber,
          description: workOrder.description,
          customerId: workOrder.customerId
        },
        create: {
          id: workOrder.id,
          frontNumber: workOrder.frontNumber,
          backNumber: workOrder.backNumber,
          description: workOrder.description,
          customerId: workOrder.customerId
        }
      });
    }
    console.log(`✅ ${WORK_ORDER_DATA.length}件の工番データを移行しました`);

    // 5. 日報データの移行
    console.log('📊 日報データを移行中...');
    let reportCount = 0;
    let reportItemCount = 0;

    for (const report of SAMPLE_REPORTS) {
      // 作業者IDを取得
      const workerId = dataHelpers.getWorkerId(report.workerName);
      if (!workerId) {
        console.warn(`⚠️ 作業者 "${report.workerName}" が見つかりません。スキップします。`);
        continue;
      }

      // 日報を作成
      const createdReport = await prisma.report.upsert({
        where: { id: report.id || `report-${Date.now()}-${Math.random()}` },
        update: {
          date: new Date(report.date),
          workerId: workerId,
          submittedAt: new Date(report.submittedAt || new Date())
        },
        create: {
          id: report.id || `report-${Date.now()}-${Math.random()}`,
          date: new Date(report.date),
          workerId: workerId,
          submittedAt: new Date(report.submittedAt || new Date())
        }
      });

      reportCount++;

      // 日報項目を作成
      for (const workItem of report.workItems) {
        const customerId = dataHelpers.getCustomerId(workItem.customerName);
        const workOrderId = dataHelpers.getWorkOrderId(workItem.workNumberFront, workItem.workNumberBack);
        const machineId = dataHelpers.getMachineId(workItem.machineType);

        if (!customerId || !workOrderId || !machineId) {
          console.warn(`⚠️ 日報項目 "${workItem.name}" の関連データが見つかりません。スキップします。`);
          continue;
        }

        // 開始時刻と終了時刻を組み合わせてDateTimeに変換
        const startDateTime = new Date(`${report.date}T${workItem.startTime}:00`);
        const endDateTime = new Date(`${report.date}T${workItem.endTime}:00`);

        await prisma.reportItem.create({
          data: {
            reportId: createdReport.id,
            customerId: customerId,
            workOrderId: workOrderId,
            machineId: machineId,
            startTime: startDateTime,
            endTime: endDateTime,
            workStatus: workItem.workStatus || 'normal',
            remarks: workItem.remarks || ''
          }
        });

        reportItemCount++;
      }
    }

    console.log(`✅ ${reportCount}件の日報データと${reportItemCount}件の日報項目を移行しました`);

    // 6. 移行結果の確認
    console.log('\n📈 移行結果の確認:');
    const userCount = await prisma.user.count();
    const customerCount = await prisma.customer.count();
    const machineCount = await prisma.machine.count();
    const workOrderCount = await prisma.workOrder.count();
    const reportCountFinal = await prisma.report.count();
    const reportItemCountFinal = await prisma.reportItem.count();

    console.log(`- 作業者: ${userCount}件`);
    console.log(`- 客先: ${customerCount}件`);
    console.log(`- 機械: ${machineCount}件`);
    console.log(`- 工番: ${workOrderCount}件`);
    console.log(`- 日報: ${reportCountFinal}件`);
    console.log(`- 日報項目: ${reportItemCountFinal}件`);

    console.log('\n🎉 データ移行が完了しました！');

  } catch (error) {
    console.error('❌ データ移行中にエラーが発生しました:', error);
    
    // データベース接続エラーの場合
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = (error as { code?: string }).code;
    if (errorCode === 'P1001' || errorMessage.includes('fetch failed')) {
      console.log('\n💡 データベース接続エラーの解決方法:');
      console.log('1. .env.localファイルを作成し、DATABASE_URLを設定してください');
      console.log('2. Neonデータベースが正しく設定されているか確認してください');
      console.log('3. 以下のコマンドでデータベーススキーマをプッシュしてください:');
      console.log('   npm run db:push');
      console.log('\n📚 詳細は NEON_SETUP.md を参照してください');
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  migrateData()
    .then(() => {
      console.log('✅ 移行スクリプトが正常に完了しました');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 移行スクリプトでエラーが発生しました:', error);
      process.exit(1);
    });
}

export { migrateData };
