import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMachines() {
  console.log('🔍 機械マスタと機械単価を確認します\n');

  try {
    // 機械マスタを取得
    const machines = await prisma.machine.findMany({
      orderBy: { name: 'asc' },
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 機械マスタ一覧');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    machines.forEach((machine, index) => {
      console.log(`${index + 1}. ${machine.name} (ID: ${machine.id}, Active: ${machine.isActive})`);
    });

    // 機械単価（machineIdがnull）を取得
    const machineRates = await prisma.rate.findMany({
      where: {
        activityType: 'machine',
      },
      orderBy: { displayName: 'asc' },
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💰 機械単価一覧');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    machineRates.forEach((rate, index) => {
      const status = rate.machineId ? '✅ 紐付け済' : '❌ 未紐付け';
      console.log(`${index + 1}. ${rate.displayName} (Activity: ${rate.activity}, MachineID: ${rate.machineId || 'null'}) ${status}`);
    });

    console.log('\n');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkMachines()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

