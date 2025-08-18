import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDates() {
  try {
    console.log('=== データベースの日付データ確認 ===');
    
    // 2025年11月のデータを確認
    const novemberReports = await prisma.report.findMany({
      where: {
        date: {
          gte: new Date(2025, 10, 1), // 11月1日
          lte: new Date(2025, 10, 30), // 11月30日
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

    console.log(`\n2025年11月のレポート数: ${novemberReports.length}`);
    novemberReports.forEach(report => {
      console.log(`- ${report.date.toISOString().split('T')[0]} (${report.worker.name})`);
    });

    // 2025年10月のデータも確認
    const octoberReports = await prisma.report.findMany({
      where: {
        date: {
          gte: new Date(2025, 9, 1), // 10月1日
          lte: new Date(2025, 9, 31), // 10月31日
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

    console.log(`\n2025年10月のレポート数: ${octoberReports.length}`);
    octoberReports.forEach(report => {
      console.log(`- ${report.date.toISOString().split('T')[0]} (${report.worker.name})`);
    });

    // 全期間の日付範囲を確認
    const dateRange = await prisma.report.findMany({
      select: {
        date: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    if (dateRange.length > 0) {
      console.log(`\n全期間の日付範囲:`);
      console.log(`- 開始: ${dateRange[0].date.toISOString().split('T')[0]}`);
      console.log(`- 終了: ${dateRange[dateRange.length - 1].date.toISOString().split('T')[0]}`);
    }

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDates();

