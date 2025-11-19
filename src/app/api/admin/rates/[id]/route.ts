import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// 単価更新用スキーマ
const updateRateSchema = z.object({
  activity: z.string().min(1).max(50).optional(),
  activityType: z.enum(['labor', 'machine']).optional(),
  displayName: z.string().min(1).max(100).optional(),
  costRate: z.number().positive().optional(),
  billRate: z.number().positive().optional(),
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().optional().nullable(),
  memo: z.string().max(200).optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: 単価詳細取得
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    const rate = await prisma.rate.findUnique({
      where: { id },
    });

    if (!rate) {
      return NextResponse.json(
        {
          success: false,
          error: '単価が見つかりません',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: rate,
    });
  } catch (error) {
    console.error('Failed to fetch rate:', error);
    return NextResponse.json(
      {
        success: false,
        error: '単価の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

// PUT: 単価更新
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = updateRateSchema.parse(body);

    const rate = await prisma.rate.update({
      where: { id },
      data: {
        ...(validatedData.activity && { activity: validatedData.activity }),
        ...(validatedData.activityType && { activityType: validatedData.activityType }),
        ...(validatedData.displayName && { displayName: validatedData.displayName }),
        ...(validatedData.costRate !== undefined && { costRate: Math.round(validatedData.costRate) }),
        ...(validatedData.billRate !== undefined && { billRate: Math.round(validatedData.billRate) }),
        ...(validatedData.effectiveFrom && { effectiveFrom: new Date(validatedData.effectiveFrom) }),
        ...(validatedData.effectiveTo !== undefined && { 
          effectiveTo: validatedData.effectiveTo ? new Date(validatedData.effectiveTo) : null 
        }),
        ...(validatedData.memo !== undefined && { memo: validatedData.memo || null }),
      },
    });

    return NextResponse.json({
      success: true,
      data: rate,
    });
  } catch (error) {
    console.error('Failed to update rate:', error);

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
        error: '単価の更新に失敗しました',
      },
      { status: 500 }
    );
  }
}

// DELETE: 単価削除（物理削除）
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    const rate = await prisma.rate.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: rate,
    });
  } catch (error) {
    console.error('Failed to delete rate:', error);
    return NextResponse.json(
      {
        success: false,
        error: '単価の削除に失敗しました',
      },
      { status: 500 }
    );
  }
}

