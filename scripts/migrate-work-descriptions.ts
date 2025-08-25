import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 本番環境用データ移行スクリプト
 * 既存のworkOrder.descriptionをreportItem.workDescriptionにコピーする
 * 
 * 実行方法:
 * npx tsx scripts/migrate-work-descriptions.ts
 */
async function migrateWorkDescriptions() {
  console.log('🚀 データ移行を開始します...');
  
  try {
    // workDescriptionがnullの全てのレポートアイテムを取得
    const reportItems = await prisma.reportItem.findMany({
      where: {
        workDescription: null
      },
      include: {
        workOrder: {
          select: {
            description: true
          }
        }
      }
    });

    console.log(`📊 移行対象のレポートアイテム: ${reportItems.length}件`);

    if (reportItems.length === 0) {
      console.log('✅ 移行する必要のあるデータがありません。');
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;

    // 各レポートアイテムを更新
    for (const item of reportItems) {
      if (item.workOrder.description) {
        await prisma.reportItem.update({
          where: { id: item.id },
          data: {
            workDescription: item.workOrder.description
          }
        });
        migratedCount++;
        
        if (migratedCount % 100 === 0) {
          console.log(`📝 進行状況: ${migratedCount}/${reportItems.length}件完了`);
        }
      } else {
        skippedCount++;
        console.log(`⚠️  スキップ: workOrder.descriptionがnull (レポートアイテムID: ${item.id})`);
      }
    }

    console.log('✅ データ移行が完了しました！');
    console.log(`📊 移行統計:`);
    console.log(`   - 移行完了: ${migratedCount}件`);
    console.log(`   - スキップ: ${skippedCount}件`);
    console.log(`   - 合計処理: ${reportItems.length}件`);

  } catch (error) {
    console.error('❌ データ移行中にエラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプト実行
if (require.main === module) {
  migrateWorkDescriptions()
    .then(() => {
      console.log('🎉 スクリプトが正常に完了しました。');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 スクリプトの実行に失敗しました:', error);
      process.exit(1);
    });
}

export { migrateWorkDescriptions };
