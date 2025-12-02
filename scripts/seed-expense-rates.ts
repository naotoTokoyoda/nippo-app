/**
 * 経費率の初期データを作成するスクリプト
 * 実行方法: npx ts-node scripts/seed-expense-rates.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('経費率の初期データを作成します...');

  const categories = [
    { categoryName: '材料費', markupRate: 1.20 },
    { categoryName: '外注費', markupRate: 1.20 },
    { categoryName: '配送費', markupRate: 1.20 },
    { categoryName: 'その他', markupRate: 1.20 },
  ];

  for (const category of categories) {
    const existing = await prisma.expenseRate.findUnique({
      where: { categoryName: category.categoryName },
    });

    if (existing) {
      console.log(`✓ ${category.categoryName} は既に存在します`);
    } else {
      await prisma.expenseRate.create({
        data: category,
      });
      console.log(`✓ ${category.categoryName} を作成しました (20%)`);
    }
  }

  console.log('\n完了しました！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

