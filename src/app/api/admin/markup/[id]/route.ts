import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// マークアップ率更新用スキーマ
// markupRateは倍率として受け取る（例: 1.20 = 20%マークアップ）
const updateMarkupSchema = z.object({
  category: z.enum(['materials', 'outsourcing', 'shipping', 'other']).optional(),
  markupRate: z.number().min(1).max(2).optional(), // 1.00（0%）から2.00（100%）まで
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().optional().nullable(),
  memo: z.string().max(200).optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: マークアップ率詳細取得
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    const setting = await prisma.expenseMarkupSetting.findUnique({
      where: { id },
    });

    if (!setting) {
      return NextResponse.json(
        {
          success: false,
          error: 'マークアップ率設定が見つかりません',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: setting,
    });
  } catch (error) {
    console.error('Failed to fetch markup setting:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'マークアップ率の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

// PUT: マークアップ率更新
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = updateMarkupSchema.parse(body);

    const setting = await prisma.expenseMarkupSetting.update({
      where: { id },
      data: {
        ...(validatedData.category && { category: validatedData.category }),
        ...(validatedData.markupRate !== undefined && { markupRate: validatedData.markupRate }),
        ...(validatedData.effectiveFrom && { effectiveFrom: new Date(validatedData.effectiveFrom) }),
        ...(validatedData.effectiveTo !== undefined && { 
          effectiveTo: validatedData.effectiveTo ? new Date(validatedData.effectiveTo) : null 
        }),
        ...(validatedData.memo !== undefined && { memo: validatedData.memo || null }),
      },
    });

    return NextResponse.json({
      success: true,
      data: setting,
    });
  } catch (error) {
    console.error('Failed to update markup setting:', error);

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
        error: 'マークアップ率の更新に失敗しました',
      },
      { status: 500 }
    );
  }
}

// DELETE: マークアップ率削除（物理削除）
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    const setting = await prisma.expenseMarkupSetting.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: setting,
    });
  } catch (error) {
    console.error('Failed to delete markup setting:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'マークアップ率の削除に失敗しました',
      },
      { status: 500 }
    );
  }
}

