import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteTestReports() {
  try {
    console.log('=== テスト用日報データの削除 ===');
    
    // レポートアイテムを削除
    const deletedItems = await prisma.reportItem.deleteMany({
      where: {
        report: {
          worker: {
            name: "橋本正朗"
          }
        }
      }
    });
    console.log(`削除されたレポートアイテム: ${deletedItems.count}件`);
    
    // レポートを削除
    const deletedReports = await prisma.report.deleteMany({
      where: {
        worker: {
          name: "橋本正朗"
        }
      }
    });
    console.log(`削除されたレポート: ${deletedReports.count}件`);
    
    console.log('✅ テストデータの削除が完了しました');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteTestReports();
