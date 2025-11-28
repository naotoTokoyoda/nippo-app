import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 既存の機械単価データに対応する機械を機械マスタに追加するスクリプト
 */
async function addMissingMachines() {
  console.log('🔄 不足している機械を機械マスタに追加します...\n');

  try {
    // 実際に使われている全ての機械を追加
    const machinesToAdd = [
      { name: 'MILLAC 1052 VII', memo: 'ボール盤' },
      { name: 'MILLAC 761 VII', memo: 'ボール盤' },
      { name: '250 : NC旋盤マザック', memo: 'NC旋盤' },
      { name: '350 : NC旋盤マザック', memo: 'NC旋盤' },
      { name: 'スマート250 L : NC旋盤', memo: 'NC旋盤' },
      { name: 'Mazak REX', memo: 'マシニングセンタ' },
      { name: 'Mazatrol M-32', memo: 'マシニングセンタ' },
      { name: '正面盤 : Chubu LF 500', memo: 'フライス盤' },
      { name: '12尺 : 汎用旋盤', memo: '汎用旋盤' },
      { name: '汎用旋盤', memo: '汎用旋盤' },
      { name: '溶接', memo: '溶接機' },
      { name: '該当なし', memo: '機械を使用しない作業' },
    ];

    let addedCount = 0;
    let skippedCount = 0;

    for (const machineData of machinesToAdd) {
      // 既に存在するか確認
      const existing = await prisma.machine.findFirst({
        where: { name: machineData.name },
      });

      if (existing) {
        console.log(`⏭️  スキップ: ${machineData.name} (既に登録済み)`);
        skippedCount++;
      } else {
        const machine = await prisma.machine.create({
          data: {
            name: machineData.name,
            memo: machineData.memo,
            isActive: true,
          },
        });
        console.log(`✅ 追加: ${machine.name} (ID: ${machine.id})`);
        addedCount++;
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ 追加完了: ${addedCount}件`);
    console.log(`⏭️  スキップ: ${skippedCount}件`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addMissingMachines()
  .then(() => {
    console.log('✨ スクリプトが正常に完了しました');
    console.log('📝 次に update-existing-machine-rates.ts を実行してください\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ スクリプトが失敗しました:', error);
    process.exit(1);
  });

