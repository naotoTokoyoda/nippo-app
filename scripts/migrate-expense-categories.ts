/**
 * 既存の経費データのカテゴリを英語から日本語に変換するスクリプト
 * 実行方法: npx tsx scripts/migrate-expense-categories.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORY_MAPPING: Record<string, string> = {
  'materials': '材料費',
  'outsourcing': '外注費',
  'shipping': '配送費',
  'other': 'その他',
};

async function main() {
  console.log('経費カテゴリを英語から日本語に変換します...\n');

  for (const [oldCategory, newCategory] of Object.entries(CATEGORY_MAPPING)) {
    const result = await prisma.material.updateMany({
      where: {
        category: oldCategory,
      },
      data: {
        category: newCategory,
      },
    });

    if (result.count > 0) {
      console.log(`✓ ${oldCategory} → ${newCategory}: ${result.count}件を更新しました`);
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

