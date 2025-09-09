import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedRates() {
  console.log('🌱 基本単価データをシードしています...');

  // 既存のRateデータを削除
  await prisma.rate.deleteMany();

  // 現在の基本単価を挿入
  const rates = [
    {
      activity: 'NORMAL',
      effectiveFrom: new Date('2024-01-01'),
      effectiveTo: null, // 現在有効
      costRate: 11000,
      billRate: 11000,
    },
    {
      activity: 'TRAINEE1',
      effectiveFrom: new Date('2024-01-01'),
      effectiveTo: null,
      costRate: 11000,
      billRate: 11000,
    },
    {
      activity: 'INSPECTION',
      effectiveFrom: new Date('2024-01-01'),
      effectiveTo: null,
      costRate: 11000,
      billRate: 11000,
    },
    {
      activity: 'M_1052',
      effectiveFrom: new Date('2024-01-01'),
      effectiveTo: null,
      costRate: 13000,
      billRate: 13000,
    },
    {
      activity: 'M_SHOMEN',
      effectiveFrom: new Date('2024-01-01'),
      effectiveTo: null,
      costRate: 13000,
      billRate: 13000,
    },
    {
      activity: 'M_12SHAKU',
      effectiveFrom: new Date('2024-01-01'),
      effectiveTo: null,
      costRate: 13000,
      billRate: 13000,
    },
  ];

  for (const rate of rates) {
    await prisma.rate.create({
      data: rate,
    });
    console.log(`✅ ${rate.activity}: 原価${rate.costRate}円, 請求${rate.billRate}円`);
  }

  console.log('🎉 基本単価データのシードが完了しました');
}

async function main() {
  try {
    await seedRates();
  } catch (error) {
    console.error('❌ シードエラー:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
