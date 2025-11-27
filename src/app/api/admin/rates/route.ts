import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// 単価作成用スキーマ
const createRateSchema = z.object({
  activity: z.string().min(1).max(50),
  activityType: z.enum(['labor', 'machine']),
  displayName: z.string().min(1).max(100),
  machineId: z.string().optional().nullable(), // 機械単価の場合は機械IDを指定
  costRate: z.number().positive(),
  billRate: z.number().positive(),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional().nullable(),
  memo: z.string().max(200).optional().nullable(),
});

// GET: 単価一覧取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const activityType = searchParams.get('activityType');

    const rates = await prisma.rate.findMany({
      where: {
        ...(activityType && { activityType }),
      },
      include: {
        machine: true, // 機械情報を含める
      },
      orderBy: [
        { activityType: 'asc' },
        { effectiveFrom: 'desc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: rates,
    });
  } catch (error) {
    console.error('Failed to fetch rates:', error);
    return NextResponse.json(
      {
        success: false,
        error: '単価の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

// POST: 新規単価作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createRateSchema.parse(body);

    const rate = await prisma.rate.create({
      data: {
        activity: validatedData.activity,
        activityType: validatedData.activityType,
        displayName: validatedData.displayName,
        machineId: validatedData.machineId || null,
        costRate: Math.round(validatedData.costRate),
        billRate: Math.round(validatedData.billRate),
        effectiveFrom: new Date(validatedData.effectiveFrom),
        effectiveTo: validatedData.effectiveTo ? new Date(validatedData.effectiveTo) : null,
        memo: validatedData.memo || null,
      },
      include: {
        machine: true, // 機械情報を含めて返す
      },
    });

    return NextResponse.json({
      success: true,
      data: rate,
    });
  } catch (error) {
    console.error('Failed to create rate:', error);
    
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
        error: '単価の作成に失敗しました',
      },
      { status: 500 }
    );
  }
}

