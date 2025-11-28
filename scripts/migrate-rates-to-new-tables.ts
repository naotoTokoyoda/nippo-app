import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 既存のRateデータを新しいLaborRateとMachineRateテーブルに移行するスクリプト
 */
async function migrateRates() {
  console.log('🔄 単価データの移行を開始します...\n');

  try {
    // 既存のRateデータを取得
    const oldRates = await prisma.rate.findMany({
      include: {
        machine: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log(`📊 移行対象: ${oldRates.length}件の単価データ\n`);

    let laborCount = 0;
    let machineCount = 0;
    let skippedCount = 0;

    for (const rate of oldRates) {
      try {
        if (rate.activityType === 'labor') {
          // 人工費単価を移行
          await prisma.laborRate.create({
            data: {
              laborName: rate.displayName,
              effectiveFrom: rate.effectiveFrom,
              effectiveTo: rate.effectiveTo,
              costRate: rate.costRate,
              billRate: rate.billRate,
              memo: rate.memo,
              createdAt: rate.createdAt,
              updatedAt: rate.updatedAt,
            },
          });
          laborCount++;
          console.log(`✅ 人工費単価を移行: ${rate.displayName} (${rate.activity})`);
        } else if (rate.activityType === 'machine') {
          // 機械単価を移行
          if (!rate.machineId) {
            console.log(`⚠️  スキップ: 機械IDがありません - ${rate.displayName} (${rate.activity})`);
            skippedCount++;
            continue;
          }

          // 機械名を取得（機械マスタから）
          const machineName = rate.machine?.name || rate.displayName;

          await prisma.machineRate.create({
            data: {
              machineId: rate.machineId,
              machineName: machineName,
              effectiveFrom: rate.effectiveFrom,
              effectiveTo: rate.effectiveTo,
              costRate: rate.costRate,
              billRate: rate.billRate,
              memo: rate.memo,
              createdAt: rate.createdAt,
              updatedAt: rate.updatedAt,
            },
          });
          machineCount++;
          console.log(`✅ 機械単価を移行: ${machineName} (${rate.activity})`);
        } else {
          console.log(`⚠️  スキップ: 不明な種別 - ${rate.activityType}`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`❌ 移行失敗: ${rate.displayName} (${rate.activity})`, error);
        skippedCount++;
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ データ移行完了');
    console.log(`   人工費単価: ${laborCount}件`);
    console.log(`   機械単価: ${machineCount}件`);
    console.log(`   スキップ: ${skippedCount}件`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ データ移行中にエラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプト実行
migrateRates()
  .then(() => {
    console.log('✅ スクリプト完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ スクリプト失敗:', error);
    process.exit(1);
  });

