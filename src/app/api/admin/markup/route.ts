import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// マークアップ率作成用スキーマ
const createMarkupSchema = z.object({
  category: z.enum(['materials', 'outsourcing', 'shipping', 'other']),
  markupRate: z.number().min(0).max(100),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional().nullable(),
  memo: z.string().max(200).optional().nullable(),
});

// GET: マークアップ率一覧取得
export async function GET() {
  try {
    const settings = await prisma.expenseMarkupSetting.findMany({
      orderBy: [
        { category: 'asc' },
        { effectiveFrom: 'desc' },
      ],
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
        effectiveFrom: new Date(validatedData.effectiveFrom),
        effectiveTo: validatedData.effectiveTo ? new Date(validatedData.effectiveTo) : null,
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

    return NextResponse.json(
      {
        success: false,
        error: 'マークアップ率の作成に失敗しました',
      },
      { status: 500 }
    );
  }
}

