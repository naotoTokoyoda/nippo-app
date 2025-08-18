import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkActualData() {
  try {
    console.log('=== 実際の日報データ確認 ===');
    
    // 全レポートの日付を確認
    const allReports = await prisma.report.findMany({
      select: {
        id: true,
        date: true,
        worker: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    console.log(`\n全レポート数: ${allReports.length}`);
    allReports.forEach(report => {
      console.log(`- ID: ${report.id}, Date: ${report.date.toISOString()}, Worker: ${report.worker.name}`);
    });

    // 2025年9月のデータを確認
    const septemberReports = await prisma.report.findMany({
      where: {
        date: {
          gte: new Date(2025, 8, 1), // 9月1日
          lte: new Date(2025, 8, 30), // 9月30日
        },
      },
      select: {
        id: true,
        date: true,
        worker: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    console.log(`\n2025年9月のレポート数: ${septemberReports.length}`);
    septemberReports.forEach(report => {
      console.log(`- ID: ${report.id}, Date: ${report.date.toISOString()}, Worker: ${report.worker.name}`);
    });

    // 2025年8月のデータも確認
    const augustReports = await prisma.report.findMany({
      where: {
        date: {
          gte: new Date(2025, 7, 1), // 8月1日
          lte: new Date(2025, 7, 31), // 8月31日
        },
      },
      select: {
        id: true,
        date: true,
        worker: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    console.log(`\n2025年8月のレポート数: ${augustReports.length}`);
    augustReports.forEach(report => {
      console.log(`- ID: ${report.id}, Date: ${report.date.toISOString()}, Worker: ${report.worker.name}`);
    });

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkActualData();
