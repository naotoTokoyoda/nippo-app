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

// GET: 単価一覧取得（新しいテーブルから）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const activityType = searchParams.get('activityType');

    interface RateResponse {
      id: string;
      activity: string;
      activityType: 'labor' | 'machine';
      displayName: string;
      machineId: string | null;
      costRate: number;
      billRate: number;
      effectiveFrom: Date;
      effectiveTo: Date | null;
      memo: string | null;
      createdAt: Date;
      updatedAt: Date;
      machine?: { id: string; name: string; } | null;
    }

    let rates: RateResponse[] = [];

    if (activityType === 'labor') {
      // 人工費単価を取得
      const laborRates = await prisma.laborRate.findMany({
        orderBy: {
          effectiveFrom: 'desc',
        },
      });
      
      // 旧形式に変換
      rates = laborRates.map(rate => ({
        id: rate.id,
        activity: `LABOR_${rate.id}`, // 仮のactivityコード
        activityType: 'labor',
        displayName: rate.laborName,
        machineId: null,
        costRate: rate.costRate,
        billRate: rate.billRate,
        effectiveFrom: rate.effectiveFrom,
        effectiveTo: rate.effectiveTo,
        memo: rate.memo,
        createdAt: rate.createdAt,
        updatedAt: rate.updatedAt,
        machine: null,
      }));
    } else if (activityType === 'machine') {
      // 機械単価を取得
      const machineRates = await prisma.machineRate.findMany({
        include: {
          machine: true,
        },
        orderBy: {
          effectiveFrom: 'desc',
        },
      });
      
      // 旧形式に変換
      rates = machineRates.map(rate => ({
        id: rate.id,
        activity: `M_${rate.machineId}`, // 仮のactivityコード
        activityType: 'machine',
        displayName: rate.machineName,
        machineId: rate.machineId,
        costRate: rate.costRate,
        billRate: rate.billRate,
        effectiveFrom: rate.effectiveFrom,
        effectiveTo: rate.effectiveTo,
        memo: rate.memo,
        createdAt: rate.createdAt,
        updatedAt: rate.updatedAt,
        machine: rate.machine,
      }));
    } else {
      // 両方取得
      const laborRates = await prisma.laborRate.findMany();
      const machineRates = await prisma.machineRate.findMany({ include: { machine: true } });
      
      rates = [
        ...laborRates.map(rate => ({
          id: rate.id,
          activity: `LABOR_${rate.id}`,
          activityType: 'labor' as const,
          displayName: rate.laborName,
          machineId: null,
          costRate: rate.costRate,
          billRate: rate.billRate,
          effectiveFrom: rate.effectiveFrom,
          effectiveTo: rate.effectiveTo,
          memo: rate.memo,
          createdAt: rate.createdAt,
          updatedAt: rate.updatedAt,
          machine: null,
        })),
        ...machineRates.map(rate => ({
          id: rate.id,
          activity: `M_${rate.machineId}`,
          activityType: 'machine' as const,
          displayName: rate.machineName,
          machineId: rate.machineId,
          costRate: rate.costRate,
          billRate: rate.billRate,
          effectiveFrom: rate.effectiveFrom,
          effectiveTo: rate.effectiveTo,
          memo: rate.memo,
          createdAt: rate.createdAt,
          updatedAt: rate.updatedAt,
          machine: rate.machine,
        })),
      ];
    }

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

// POST: 新規単価作成（新しいテーブルに）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createRateSchema.parse(body);

    if (validatedData.activityType === 'labor') {
      // 人工費単価を作成
      const rate = await prisma.laborRate.create({
        data: {
          laborName: validatedData.displayName,
          costRate: Math.round(validatedData.costRate),
          billRate: Math.round(validatedData.billRate),
          effectiveFrom: new Date(validatedData.effectiveFrom),
          effectiveTo: validatedData.effectiveTo ? new Date(validatedData.effectiveTo) : null,
          memo: validatedData.memo || null,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          id: rate.id,
          activity: `LABOR_${rate.id}`,
          activityType: 'labor',
          displayName: rate.laborName,
          machineId: null,
          costRate: rate.costRate,
          billRate: rate.billRate,
          effectiveFrom: rate.effectiveFrom,
          effectiveTo: rate.effectiveTo,
          memo: rate.memo,
          createdAt: rate.createdAt,
          updatedAt: rate.updatedAt,
          machine: null,
        },
      });
    } else {
      // 機械単価を作成
      if (!validatedData.machineId) {
        return NextResponse.json(
          {
            success: false,
            error: '機械単価には機械IDが必要です',
          },
          { status: 400 }
        );
      }

      // 機械情報を取得
      const machine = await prisma.machine.findUnique({
        where: { id: validatedData.machineId },
      });

      if (!machine) {
        return NextResponse.json(
          {
            success: false,
            error: '機械が見つかりません',
          },
          { status: 404 }
        );
      }

      const rate = await prisma.machineRate.create({
        data: {
          machineId: validatedData.machineId,
          machineName: machine.name,
          costRate: Math.round(validatedData.costRate),
          billRate: Math.round(validatedData.billRate),
          effectiveFrom: new Date(validatedData.effectiveFrom),
          effectiveTo: validatedData.effectiveTo ? new Date(validatedData.effectiveTo) : null,
          memo: validatedData.memo || null,
        },
        include: {
          machine: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          id: rate.id,
          activity: `M_${rate.machineId}`,
          activityType: 'machine',
          displayName: rate.machineName,
          machineId: rate.machineId,
          costRate: rate.costRate,
          billRate: rate.billRate,
          effectiveFrom: rate.effectiveFrom,
          effectiveTo: rate.effectiveTo,
          memo: rate.memo,
          createdAt: rate.createdAt,
          updatedAt: rate.updatedAt,
          machine: rate.machine,
        },
      });
    }
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

