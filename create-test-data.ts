import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestData() {
  try {
    console.log('🚀 テストデータの作成を開始します...');

    // テスト用の作業者を作成
    const testUser = await prisma.user.create({
      data: { name: 'テスト作業者' }
    });
    console.log('👤 テスト作業者を作成:', testUser.name);

    // テスト用の客先を作成
    const testCustomer = await prisma.customer.create({
      data: { 
        name: 'テスト客先',
        code: 'TEST001'
      }
    });
    console.log('🏢 テスト客先を作成:', testCustomer.name);

    // テスト用の機械を作成
    const testMachine = await prisma.machine.create({
      data: { 
        name: 'テスト機械',
        category: 'テスト'
      }
    });
    console.log('🔧 テスト機械を作成:', testMachine.name);

    // テスト用の工番を作成
    const testWorkOrder = await prisma.workOrder.create({
      data: { 
        frontNumber: 'TEST',
        backNumber: '001',
        description: 'テスト工番',
        customerId: testCustomer.id
      }
    });
    console.log('📋 テスト工番を作成:', testWorkOrder.frontNumber + '-' + testWorkOrder.backNumber);

    // テスト用の日報を作成
    const testReport = await prisma.report.create({
      data: { 
        date: new Date('2025-08-12'),
        workerId: testUser.id,
        submittedAt: new Date()
      }
    });
    console.log('📊 テスト日報を作成:', testReport.date.toISOString().split('T')[0]);

    // テスト用の日報項目を作成
    const testReportItem = await prisma.reportItem.create({
      data: { 
        reportId: testReport.id,
        customerId: testCustomer.id,
        workOrderId: testWorkOrder.id,
        machineId: testMachine.id,
        startTime: new Date('2025-08-12T08:00:00'),
        endTime: new Date('2025-08-12T17:00:00'),
        workStatus: 'normal',
        remarks: 'テスト作業項目'
      }
    });
    console.log('📝 テスト日報項目を作成:', testReportItem.id);

    console.log('\n🎉 テストデータの作成が完了しました！');
    console.log('\n📈 作成されたデータ:');
    console.log('- 作業者: 1件');
    console.log('- 客先: 1件');
    console.log('- 機械: 1件');
    console.log('- 工番: 1件');
    console.log('- 日報: 1件');
    console.log('- 日報項目: 1件');

  } catch (error) {
    console.error('❌ テストデータ作成エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  createTestData()
    .then(() => {
      console.log('✅ テストデータ作成スクリプトが正常に完了しました');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ テストデータ作成スクリプトでエラーが発生しました:', error);
      process.exit(1);
    });
}

export { createTestData };
