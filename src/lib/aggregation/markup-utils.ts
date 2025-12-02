import { Prisma } from '@prisma/client';

/**
 * 経費カテゴリの英語名から日本語名へのマッピング
 */
export const CATEGORY_NAME_MAPPING: Record<string, string> = {
  'materials': '材料費',
  'outsourcing': '外注費',
  'shipping': '配送費',
  'other': 'その他',
};

/**
 * 経費マークアップ率を取得する
 * 
 * @param category 経費カテゴリ（日本語または英語）
 * @param tx Prismaトランザクションクライアント
 * @returns マークアップ率（例：1.20 = 20%マークアップ）。見つからない場合は1.2（デフォルト20%）
 */
export async function getCurrentMarkupRate(
  category: string,
  tx: Prisma.TransactionClient
): Promise<number> {
  // カテゴリ名を日本語に統一
  const japaneseName = CATEGORY_NAME_MAPPING[category] || category;
  
  try {
    const setting = await tx.expenseRate.findUnique({
      where: {
        categoryName: japaneseName,
        isActive: true,
      },
    });

    if (setting) {
      // Decimal型をnumberに変換
      return Number(setting.markupRate);
    }
  } catch (error) {
    console.error(`Failed to get markup rate for category ${category}:`, error);
  }

  // デフォルト値（20%マークアップ）
  return 1.2;
}

/**
 * 全ての経費カテゴリの現在有効なマークアップ率を取得する
 * 
 * @param tx Prismaトランザクションクライアント
 * @returns カテゴリごとのマークアップ率のマップ
 */
export async function getAllMarkupRates(
  tx: Prisma.TransactionClient
): Promise<Record<string, number>> {
  const categories = ['材料費', '外注費', '配送費', 'その他'];
  const markupRates: Record<string, number> = {};

  for (const category of categories) {
    markupRates[category] = await getCurrentMarkupRate(category, tx);
  }

  return markupRates;
}

