import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugDateFilter() {
  try {
    console.log('=== 日付フィルターのデバッグ ===');
    
    // 実際のAPIと同じ計算を行う
    const month = '2025-09';
    const [year, monthNum] = month.split('-');
    
    // 指定された月の最初の日と最後の日を計算（タイムゾーン考慮）
    const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(monthNum), 0);
    
    // 日本時間の開始と終了を設定（UTC-9時間で調整）
    const jstStartDate = new Date(startDate.getTime() - 9 * 60 * 60 * 1000); // UTC-9時間
    const jstEndDate = new Date(endDate.getTime() + 15 * 60 * 60 * 1000 - 1); // UTC+15時間-1ミリ秒
    
    console.log('\n=== 日付計算の詳細 ===');
    console.log(`month: ${month}`);
    console.log(`year: ${year}, monthNum: ${monthNum}`);
    console.log(`startDate (ローカル): ${startDate.toISOString()} (${startDate.toLocaleDateString('ja-JP')})`);
    console.log(`endDate (ローカル): ${endDate.toISOString()} (${endDate.toLocaleDateString('ja-JP')})`);
    console.log(`jstStartDate (フィルター用): ${jstStartDate.toISOString()}`);
    console.log(`jstEndDate (フィルター用): ${jstEndDate.toISOString()}`);
    
    // 実際のクエリを実行
    const reports = await prisma.report.findMany({
      where: {
        date: {
          gte: jstStartDate,
          lte: jstEndDate,
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

    console.log(`\n=== フィルター結果 ===`);
    console.log(`フィルター条件: ${jstStartDate.toISOString()} <= date <= ${jstEndDate.toISOString()}`);
    console.log(`結果件数: ${reports.length}`);
    reports.forEach(report => {
      const reportDateJST = new Date(report.date.getTime() + 9 * 60 * 60 * 1000);
      console.log(`- ID: ${report.id}`);
      console.log(`  Date (UTC): ${report.date.toISOString()}`);
      console.log(`  Date (JST): ${reportDateJST.toISOString()}`);
      console.log(`  Date (表示用): ${report.date.toISOString().split('T')[0]}`);
      console.log(`  Worker: ${report.worker.name}`);
    });

    // 各レポートが条件に合致するかチェック
    console.log(`\n=== 条件チェック ===`);
    reports.forEach(report => {
      const isInRange = report.date >= jstStartDate && report.date <= jstEndDate;
      console.log(`- ${report.date.toISOString()}: ${isInRange ? 'OK' : 'NG'}`);
    });

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDateFilter();
