import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugDates() {
  try {
    console.log('=== データベースの日付データ詳細確認 ===');
    
    // 2025年10月31日のデータを確認
    const october31Reports = await prisma.report.findMany({
      where: {
        date: {
          gte: new Date(2025, 9, 31),
          lte: new Date(2025, 9, 31),
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
    });

    console.log(`\n2025年10月31日のレポート数: ${october31Reports.length}`);
    october31Reports.forEach(report => {
      console.log(`- ID: ${report.id}, Date: ${report.date.toISOString()}, Worker: ${report.worker.name}`);
    });

    // 2025年11月1日のデータを確認
    const november1Reports = await prisma.report.findMany({
      where: {
        date: {
          gte: new Date(2025, 10, 1),
          lte: new Date(2025, 10, 1),
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
    });

    console.log(`\n2025年11月1日のレポート数: ${november1Reports.length}`);
    november1Reports.forEach(report => {
      console.log(`- ID: ${report.id}, Date: ${report.date.toISOString()}, Worker: ${report.worker.name}`);
    });

    // 月の境界のデータを確認
    console.log('\n=== 月の境界のデータ確認 ===');
    
    // 2025年10月の最後の日
    const lastDayOfOctober = new Date(2025, 9, 31);
    console.log(`2025年10月の最後の日: ${lastDayOfOctober.toISOString()}`);
    
    // 2025年11月の最初の日
    const firstDayOfNovember = new Date(2025, 10, 1);
    console.log(`2025年11月の最初の日: ${firstDayOfNovember.toISOString()}`);
    
    // 2025年11月の最後の日
    const lastDayOfNovember = new Date(2025, 10, 30);
    console.log(`2025年11月の最後の日: ${lastDayOfNovember.toISOString()}`);

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDates();
