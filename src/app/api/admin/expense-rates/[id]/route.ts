import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// 経費率更新用スキーマ
const updateExpenseRateSchema = z.object({
  categoryName: z.string().min(1).max(100).optional(),
  markupRate: z.number().min(1).max(2).optional(),
  memo: z.string().max(200).optional().nullable(),
});

// GET: 経費率詳細取得
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const rate = await prisma.expenseRate.findUnique({
      where: { id },
    });

    if (!rate) {
      return NextResponse.json(
        {
          success: false,
          error: '経費率が見つかりません',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: rate,
    });
  } catch (error) {
    console.error('Failed to fetch expense rate:', error);
    return NextResponse.json(
      {
        success: false,
        error: '経費率の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

// PUT: 経費率更新
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const validatedData = updateExpenseRateSchema.parse(body);

    // IDで既存データを確認
    const existing = await prisma.expenseRate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: '経費率が見つかりません',
        },
        { status: 404 }
      );
    }

    // カテゴリ名を変更する場合、重複チェック
    if (validatedData.categoryName && validatedData.categoryName !== existing.categoryName) {
      const duplicate = await prisma.expenseRate.findUnique({
        where: {
          categoryName: validatedData.categoryName,
        },
      });

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error: 'このカテゴリ名は既に登録されています',
          },
          { status: 400 }
        );
      }
    }

    const rate = await prisma.expenseRate.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json({
      success: true,
      data: rate,
    });
  } catch (error) {
    console.error('Failed to update expense rate:', error);
    
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
        error: '経費率の更新に失敗しました',
      },
      { status: 500 }
    );
  }
}

// DELETE: 経費率削除（論理削除）
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const existing = await prisma.expenseRate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: '経費率が見つかりません',
        },
        { status: 404 }
      );
    }

    // 論理削除
    await prisma.expenseRate.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: '経費率を削除しました',
    });
  } catch (error) {
    console.error('Failed to delete expense rate:', error);
    return NextResponse.json(
      {
        success: false,
        error: '経費率の削除に失敗しました',
      },
      { status: 500 }
    );
  }
}

