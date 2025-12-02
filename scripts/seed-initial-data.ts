import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedInitialData() {
  console.log('🌱 初期データをシードしています...');

  // 1. 初期Admin作成
  console.log('\n📌 初期Adminユーザーを作成...');
  
  const hashedPassword = await bcrypt.hash('Letmein2025', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'ntokoyoda@sevenstars-ltd.com' },
    update: {},
    create: {
      name: '常世田',
      role: 'admin',
      email: 'ntokoyoda@sevenstars-ltd.com',
      password: hashedPassword,
      pin: '0000',
      isTrainee: false,
      isActive: true,
    },
  });
  
  console.log(`✅ Admin作成: ${admin.name} (${admin.email})`);

  // 2. ExpenseRate初期データ作成
  console.log('\n📌 経費率設定を作成...');
  
  // 既存データを削除
  await prisma.expenseRate.deleteMany();
  
  const expenseRates = [
    {
      categoryName: '材料費',
      markupRate: 1.20, // 20%マークアップ
      memo: '初期設定（20%マークアップ）',
      isActive: true,
    },
    {
      categoryName: '外注費',
      markupRate: 1.20,
      memo: '初期設定（20%マークアップ）',
      isActive: true,
    },
    {
      categoryName: '配送費',
      markupRate: 1.20,
      memo: '初期設定（20%マークアップ）',
      isActive: true,
    },
    {
      categoryName: 'その他',
      markupRate: 1.20,
      memo: '初期設定（20%マークアップ）',
      isActive: true,
    },
  ];

  for (const setting of expenseRates) {
    await prisma.expenseRate.create({
      data: setting,
    });
    console.log(`✅ ${setting.categoryName}: ${setting.markupRate}倍（${(setting.markupRate - 1) * 100}%）`);
  }

  console.log('\n🎉 初期データのシードが完了しました');
}

async function main() {
  try {
    await seedInitialData();
  } catch (error) {
    console.error('❌ シードエラー:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

