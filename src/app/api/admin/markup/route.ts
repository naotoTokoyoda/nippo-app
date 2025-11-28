import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// マークアップ率作成用スキーマ
// markupRateは倍率として受け取る（例: 1.20 = 20%マークアップ）
const createMarkupSchema = z.object({
  category: z.enum(['materials', 'outsourcing', 'shipping', 'other']),
  markupRate: z.number().min(1).max(2), // 1.00（0%）から2.00（100%）まで
  memo: z.string().max(200).optional().nullable(),
});

// GET: マークアップ率一覧取得
export async function GET() {
  try {
    const settings = await prisma.expenseMarkupSetting.findMany({
      orderBy: {
        category: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Failed to fetch markup settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'マークアップ率の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

// POST: 新規マークアップ率作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createMarkupSchema.parse(body);

    const setting = await prisma.expenseMarkupSetting.create({
      data: {
        category: validatedData.category,
        markupRate: validatedData.markupRate,
        memo: validatedData.memo || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: setting,
    });
  } catch (error) {
    console.error('Failed to create markup setting:', error);
    
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

    // Prismaのエラーハンドリング
    if (error && typeof error === 'object' && 'code' in error) {
      // ユニーク制約エラー
      if (error.code === 'P2002') {
        return NextResponse.json(
          {
            success: false,
            error: 'この日付で既に設定が存在します',
          },
          { status: 400 }
        );
      }
      
      // 型エラー
      if (error.code === 'P2020' || error.code === 'P2007') {
        return NextResponse.json(
          {
            success: false,
            error: 'データ型が正しくありません。マークアップ率は数値で入力してください',
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'マークアップ率の作成に失敗しました',
      },
      { status: 500 }
    );
  }
}

