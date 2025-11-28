import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 機械マスタをリセットして、実際に使用する機械のみを登録するスクリプト
 */
async function resetMachines() {
  console.log('🔄 機械マスタをリセットします...\n');

  try {
    // 1. 既存の機械を全て削除
    console.log('🗑️  既存の機械を削除中...');
    const deleteResult = await prisma.machine.deleteMany({});
    console.log(`   削除完了: ${deleteResult.count}件\n`);

    // 2. 実際に使用する機械のみを登録
    console.log('➕ 機械を追加中...');
    const machinesToAdd = [
      'MILLAC 1052 VII',
      'MILLAC 761 VII',
      '250 : NC旋盤マザック',
      '350 : NC旋盤マザック',
      'スマート250 L : NC旋盤',
      'Mazak REX',
      'Mazatrol M-32',
      '正面盤 : Chubu LF 500',
      '12尺 : 汎用旋盤',
      '汎用旋盤',
      '溶接',
      '該当なし',
    ];

    let addedCount = 0;
    for (const machineName of machinesToAdd) {
      const machine = await prisma.machine.create({
        data: {
          name: machineName,
          isActive: true,
        },
      });
      console.log(`   ✅ ${machine.name} (ID: ${machine.id})`);
      addedCount++;
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✨ リセット完了`);
    console.log(`   削除: ${deleteResult.count}件`);
    console.log(`   追加: ${addedCount}件`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 3. 既存の機械単価データのmachineIdをクリア（再設定が必要）
    console.log('⚠️  既存の機械単価データのmachineIdがクリアされました');
    console.log('   update-existing-machine-rates.ts を実行して再設定してください\n');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resetMachines()
  .then(() => {
    console.log('✅ スクリプトが正常に完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ スクリプトが失敗しました:', error);
    process.exit(1);
  });

