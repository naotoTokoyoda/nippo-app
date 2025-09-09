import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAggregationTestData() {
  console.log('🌱 集計機能のテストデータをシードしています...');

  try {
    // 既存のテストデータをクリア
    await prisma.adjustment.deleteMany({});
    await prisma.reportItem.deleteMany({});
    await prisma.report.deleteMany({});
    await prisma.workOrder.deleteMany({
      where: {
        status: { in: ['aggregating', 'aggregated'] }
      }
    });

    // 顧客データを確認・作成
    let customer1 = await prisma.customer.findFirst({
      where: { code: 'ST001' }
    });
    if (!customer1) {
      customer1 = await prisma.customer.create({
        data: {
          name: '○○製鉄株式会社',
          code: 'ST001',
        }
      });
    }

    let customer2 = await prisma.customer.findFirst({
      where: { code: 'JFE001' }
    });
    if (!customer2) {
      customer2 = await prisma.customer.create({
        data: {
          name: 'JFE△△製鉄',
          code: 'JFE001',
        }
      });
    }

    // 作業者データを確認・作成
    let normalWorker = await prisma.user.findFirst({
      where: { name: '田中太郎' }
    });
    if (!normalWorker) {
      normalWorker = await prisma.user.create({
        data: { name: '田中太郎' }
      });
    }

    let traineeWorker = await prisma.user.findFirst({
      where: { name: 'ヤマダタロウ' }
    });
    if (!traineeWorker) {
      traineeWorker = await prisma.user.create({
        data: { name: 'ヤマダタロウ' } // カタカナで実習生判定
      });
    }

    // 機械データを確認・作成
    let machine1052 = await prisma.machine.findFirst({
      where: { name: 'MILLAC 1052 VII' }
    });
    if (!machine1052) {
      machine1052 = await prisma.machine.create({
        data: {
          name: 'MILLAC 1052 VII',
          category: 'NC旋盤',
        }
      });
    }

    let machineShomen = await prisma.machine.findFirst({
      where: { name: '正面盤 : Chubu LF 500' }
    });
    if (!machineShomen) {
      machineShomen = await prisma.machine.create({
        data: {
          name: '正面盤 : Chubu LF 500',
          category: '正面盤',
        }
      });
    }

    let machineNormal = await prisma.machine.findFirst({
      where: { name: '汎用旋盤' }
    });
    if (!machineNormal) {
      machineNormal = await prisma.machine.create({
        data: {
          name: '汎用旋盤',
          category: '汎用',
        }
      });
    }

    // 集計対象の工番を作成
    const workOrder1 = await prisma.workOrder.create({
      data: {
        frontNumber: '5927',
        backNumber: '12120',
        description: '高炉設備メンテナンス',
        customerId: customer1.id,
        term: '59期',
        status: 'aggregating',
        projectName: '高炉設備メンテナンス作業',
        handling: '定期保守',
        quantity: 1,
      }
    });

    const workOrder2 = await prisma.workOrder.create({
      data: {
        frontNumber: '5927',
        backNumber: 'J-726',
        description: '転炉修理作業',
        customerId: customer2.id,
        term: '59期-JFE',
        status: 'aggregating',
        projectName: '転炉修理作業一式',
        handling: '緊急対応',
        quantity: 2,
      }
    });

    // 日報データを作成
    const baseDate = new Date('2024-01-10');
    
    for (let i = 0; i < 5; i++) {
      const reportDate = new Date(baseDate);
      reportDate.setDate(baseDate.getDate() + i);

      // 通常作業者の日報
      const normalReport = await prisma.report.create({
        data: {
          date: reportDate,
          workerId: normalWorker.id,
          submittedAt: new Date(reportDate.getTime() + 18 * 60 * 60 * 1000), // 18時に提出
        }
      });

      // 実習生の日報
      const traineeReport = await prisma.report.create({
        data: {
          date: reportDate,
          workerId: traineeWorker.id,
          submittedAt: new Date(reportDate.getTime() + 18 * 60 * 60 * 1000),
        }
      });

      // 工番1の作業項目（通常作業者）
      await prisma.reportItem.create({
        data: {
          reportId: normalReport.id,
          customerId: customer1.id,
          workOrderId: workOrder1.id,
          machineId: machineNormal.id,
          startTime: new Date(reportDate.getTime() + 9 * 60 * 60 * 1000), // 9:00
          endTime: new Date(reportDate.getTime() + 12 * 60 * 60 * 1000), // 12:00
          workStatus: 'normal',
          workDescription: '設備点検作業',
          remarks: '正常完了',
        }
      });

      // 工番1の作業項目（1052機械）
      await prisma.reportItem.create({
        data: {
          reportId: normalReport.id,
          customerId: customer1.id,
          workOrderId: workOrder1.id,
          machineId: machine1052.id,
          startTime: new Date(reportDate.getTime() + 13 * 60 * 60 * 1000), // 13:00
          endTime: new Date(reportDate.getTime() + 16 * 60 * 60 * 1000), // 16:00
          workStatus: 'normal',
          workDescription: '精密加工作業',
          remarks: '加工完了',
        }
      });

      // 工番2の作業項目（実習生）
      await prisma.reportItem.create({
        data: {
          reportId: traineeReport.id,
          customerId: customer2.id,
          workOrderId: workOrder2.id,
          machineId: machineShomen.id,
          startTime: new Date(reportDate.getTime() + 9 * 60 * 60 * 1000), // 9:00
          endTime: new Date(reportDate.getTime() + 15 * 60 * 60 * 1000), // 15:00
          workStatus: 'normal',
          workDescription: '転炉修理補助作業',
          remarks: '実習中',
        }
      });

      // 検品作業項目
      if (i % 2 === 0) {
        await prisma.reportItem.create({
          data: {
            reportId: normalReport.id,
            customerId: customer1.id,
            workOrderId: workOrder1.id,
            machineId: machineNormal.id,
            startTime: new Date(reportDate.getTime() + 16 * 60 * 60 * 1000), // 16:00
            endTime: new Date(reportDate.getTime() + 17 * 60 * 60 * 1000), // 17:00
            workStatus: 'normal',
            workDescription: '検品作業',
            remarks: '品質確認済み',
          }
        });
      }
    }

    console.log('✅ 工番1:', workOrder1.frontNumber + '-' + workOrder1.backNumber);
    console.log('✅ 工番2:', workOrder2.frontNumber + '-' + workOrder2.backNumber);
    console.log('✅ 通常作業者:', normalWorker.name);
    console.log('✅ 実習生:', traineeWorker.name);
    console.log('🎉 集計機能のテストデータのシードが完了しました');

  } catch (error) {
    console.error('❌ シードエラー:', error);
    throw error;
  }
}

async function main() {
  try {
    await seedAggregationTestData();
  } catch (error) {
    console.error('❌ メインエラー:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
