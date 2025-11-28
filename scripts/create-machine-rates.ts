import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 全ての機械に対して単価を設定するスクリプト
 */
async function createMachineRates() {
  console.log('🔄 機械単価を作成します...\n');

  try {
    // 機械マスタを取得
    const machines = await prisma.machine.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    console.log(`🔧 機械マスタ: ${machines.length}件\n`);

    // 単価が¥13,000の機械
    const highPriceMachines = [
      'MILLAC 1052 VII',
      '正面盤 : Chubu LF 500',
      '12尺 : 汎用旋盤',
    ];

    let createdCount = 0;

    for (const machine of machines) {
      // 単価を決定（¥13,000 または ¥11,000）
      const isHighPrice = highPriceMachines.includes(machine.name);
      const rate = isHighPrice ? 13000 : 11000;

      // Activityコードを生成（機械名の先頭文字を大文字に）
      const activity = `M_${machine.name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;

      // 機械単価を作成
      const machineRate = await prisma.rate.create({
        data: {
          activity: activity,
          activityType: 'machine',
          displayName: machine.name,
          machineId: machine.id,
          costRate: rate,
          billRate: rate,
          effectiveFrom: new Date('2024-01-01'), // 適用開始日
          effectiveTo: null, // 無期限
          memo: null,
        },
      });

      const priceLabel = isHighPrice ? '¥13,000 (高単価)' : '¥11,000 (標準)';
      console.log(`   ✅ ${machine.name} → ${priceLabel}`);
      createdCount++;
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✨ 作成完了: ${createdCount}件`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createMachineRates()
  .then(() => {
    console.log('✅ スクリプトが正常に完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ スクリプトが失敗しました:', error);
    process.exit(1);
  });

