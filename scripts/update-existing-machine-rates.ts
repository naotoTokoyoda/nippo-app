import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 既存の機械単価データにmachineIdを設定するスクリプト
 * 
 * スキーマ変更前に作成された機械単価データは、machineIdがnullになっているため、
 * displayNameから機械マスタを検索して、適切なmachineIdを設定する
 */
async function updateExistingMachineRates() {
  console.log('🔄 既存の機械単価データを更新します...\n');

  try {
    // 1. machineIdがnullの機械単価を取得
    const machineRates = await prisma.rate.findMany({
      where: {
        activityType: 'machine',
        machineId: null,
      },
    });

    if (machineRates.length === 0) {
      console.log('✅ 更新が必要なデータはありません');
      return;
    }

    console.log(`📊 ${machineRates.length}件の機械単価データを更新します\n`);

    // 2. 機械マスタを取得
    const machines = await prisma.machine.findMany({
      where: {
        isActive: true,
      },
    });

    console.log(`🔧 機械マスタ: ${machines.length}件\n`);

    let updatedCount = 0;
    let notFoundCount = 0;

    // 3. 各機械単価に対して、displayNameから機械を検索してmachineIdを設定
    for (const rate of machineRates) {
      // displayNameから機械を検索（完全一致または部分一致）
      let machine = machines.find(m => m.name === rate.displayName);
      
      // 完全一致しない場合は、部分一致で検索
      if (!machine) {
        machine = machines.find(m => 
          m.name.includes(rate.displayName) || rate.displayName.includes(m.name)
        );
      }

      if (machine) {
        await prisma.rate.update({
          where: { id: rate.id },
          data: { 
            machineId: machine.id,
            displayName: machine.name, // 機械マスタの名前に統一
          },
        });
        console.log(`✅ 更新: ${rate.displayName} (${rate.activity}) → ${machine.name} (ID: ${machine.id})`);
        updatedCount++;
      } else {
        console.log(`⚠️  機械が見つかりません: ${rate.displayName} (${rate.activity})`);
        notFoundCount++;
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ 更新完了: ${updatedCount}件`);
    if (notFoundCount > 0) {
      console.log(`⚠️  機械が見つからなかった: ${notFoundCount}件`);
      console.log('   → 機械マスタに該当する機械を追加してから再実行してください');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプト実行
updateExistingMachineRates()
  .then(() => {
    console.log('✨ スクリプトが正常に完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ スクリプトが失敗しました:', error);
    process.exit(1);
  });

