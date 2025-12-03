import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// 経費率作成・更新用スキーマ
// markupRateは倍率として受け取る（例: 1.20 = 20%上乗せ）
const expenseRateSchema = z.object({
  categoryName: z.string().min(1).max(100),
  markupRate: z.number().min(1).max(2), // 1.00（0%）から2.00（100%）まで
  memo: z.string().max(200).optional().nullable(),
});

// GET: 経費率一覧取得（アクティブのみ）
export async function GET() {
  try {
    const rates = await prisma.expenseRate.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        categoryName: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: rates,
    });
  } catch (error) {
    console.error('Failed to fetch expense rates:', error);
    return NextResponse.json(
      {
        success: false,
        error: '経費率の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

// POST: 新規経費率作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = expenseRateSchema.parse(body);

    // 同じカテゴリ名が既に存在しないかチェック
    const existing = await prisma.expenseRate.findUnique({
      where: {
        categoryName: validatedData.categoryName,
      },
    });

    // 既存レコードがある場合
    if (existing) {
      // 削除済み（isActive=false）の場合は復活させる
      if (!existing.isActive) {
        const rate = await prisma.expenseRate.update({
          where: { id: existing.id },
          data: {
            markupRate: validatedData.markupRate,
            memo: validatedData.memo || null,
            isActive: true,
          },
        });

        return NextResponse.json({
          success: true,
          data: rate,
        });
      }
      
      // アクティブなレコードが既に存在する場合はエラー
      return NextResponse.json(
        {
          success: false,
          error: 'このカテゴリ名は既に登録されています',
        },
        { status: 400 }
      );
    }

    // 新規作成
    const rate = await prisma.expenseRate.create({
      data: {
        categoryName: validatedData.categoryName,
        markupRate: validatedData.markupRate,
        memo: validatedData.memo || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: rate,
    });
  } catch (error) {
    console.error('Failed to create expense rate:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'バリデーションエラー',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: '経費率の作成に失敗しました',
      },
      { status: 500 }
    );
  }
}

