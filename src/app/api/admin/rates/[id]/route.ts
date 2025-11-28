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
  memo: z.string().max(200).optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: 単価詳細取得（新しいテーブルから）
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // 人工費単価を検索
    const laborRate = await prisma.laborRate.findUnique({
      where: { id },
    });

    if (laborRate) {
      return NextResponse.json({
        success: true,
        data: {
          id: laborRate.id,
          activity: `LABOR_${laborRate.id}`,
          activityType: 'labor',
          displayName: laborRate.laborName,
          machineId: null,
          costRate: laborRate.costRate,
          billRate: laborRate.billRate,
          memo: laborRate.memo,
          createdAt: laborRate.createdAt,
          updatedAt: laborRate.updatedAt,
        },
      });
    }

    // 機械単価を検索
    const machineRate = await prisma.machineRate.findUnique({
      where: { id },
      include: { machine: true },
    });

    if (machineRate) {
      return NextResponse.json({
        success: true,
        data: {
          id: machineRate.id,
          activity: `M_${machineRate.machineId}`,
          activityType: 'machine',
          displayName: machineRate.machineName,
          machineId: machineRate.machineId,
          costRate: machineRate.costRate,
          billRate: machineRate.billRate,
          memo: machineRate.memo,
          createdAt: machineRate.createdAt,
          updatedAt: machineRate.updatedAt,
          machine: machineRate.machine,
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: '単価が見つかりません',
      },
      { status: 404 }
    );
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

// PUT: 単価更新（新しいテーブルに）
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = updateRateSchema.parse(body);

    // 人工費単価を検索
    const laborRate = await prisma.laborRate.findUnique({ where: { id } });
    
    if (laborRate) {
      const updated = await prisma.laborRate.update({
        where: { id },
        data: {
          ...(validatedData.displayName && { laborName: validatedData.displayName }),
          ...(validatedData.costRate !== undefined && { costRate: Math.round(validatedData.costRate) }),
          ...(validatedData.billRate !== undefined && { billRate: Math.round(validatedData.billRate) }),
          ...(validatedData.memo !== undefined && { memo: validatedData.memo || null }),
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          id: updated.id,
          activity: `LABOR_${updated.id}`,
          activityType: 'labor',
          displayName: updated.laborName,
          machineId: null,
          costRate: updated.costRate,
          billRate: updated.billRate,
          memo: updated.memo,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        },
      });
    }

    // 機械単価を検索
    const machineRate = await prisma.machineRate.findUnique({ 
      where: { id },
      include: { machine: true },
    });
    
    if (machineRate) {
      const updated = await prisma.machineRate.update({
        where: { id },
        data: {
          ...(validatedData.costRate !== undefined && { costRate: Math.round(validatedData.costRate) }),
          ...(validatedData.billRate !== undefined && { billRate: Math.round(validatedData.billRate) }),
          ...(validatedData.memo !== undefined && { memo: validatedData.memo || null }),
        },
        include: { machine: true },
      });

      return NextResponse.json({
        success: true,
        data: {
          id: updated.id,
          activity: `M_${updated.machineId}`,
          activityType: 'machine',
          displayName: updated.machineName,
          machineId: updated.machineId,
          costRate: updated.costRate,
          billRate: updated.billRate,
          memo: updated.memo,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
          machine: updated.machine,
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: '単価が見つかりません',
      },
      { status: 404 }
    );
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

// DELETE: 単価削除（物理削除、新しいテーブルから）
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // 人工費単価を検索
    const laborRate = await prisma.laborRate.findUnique({ where: { id } });
    
    if (laborRate) {
      await prisma.laborRate.delete({ where: { id } });
      return NextResponse.json({
        success: true,
        data: { id },
      });
    }

    // 機械単価を検索
    const machineRate = await prisma.machineRate.findUnique({ where: { id } });
    
    if (machineRate) {
      await prisma.machineRate.delete({ where: { id } });
      return NextResponse.json({
        success: true,
        data: { id },
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: '単価が見つかりません',
      },
      { status: 404 }
    );
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

