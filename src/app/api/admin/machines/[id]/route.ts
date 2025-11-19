import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// 機械更新用スキーマ
const updateMachineSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  memo: z.string().max(200).optional().nullable(),
  isActive: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: 機械詳細取得
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    const machine = await prisma.machine.findUnique({
      where: { id },
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

    return NextResponse.json({
      success: true,
      data: machine,
    });
  } catch (error) {
    console.error('Failed to fetch machine:', error);
    return NextResponse.json(
      {
        success: false,
        error: '機械の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

// PUT: 機械更新
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = updateMachineSchema.parse(body);

    // 機械名が変更される場合、重複チェック
    if (validatedData.name) {
      const existing = await prisma.machine.findFirst({
        where: {
          name: validatedData.name,
          NOT: { id },
        },
      });

      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: 'この機械名は既に登録されています',
          },
          { status: 400 }
        );
      }
    }

    const machine = await prisma.machine.update({
      where: { id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.memo !== undefined && { memo: validatedData.memo || null }),
        ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
      },
    });

    return NextResponse.json({
      success: true,
      data: machine,
    });
  } catch (error) {
    console.error('Failed to update machine:', error);

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
        error: '機械の更新に失敗しました',
      },
      { status: 500 }
    );
  }
}

// DELETE: 機械削除（論理削除）
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    const machine = await prisma.machine.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      data: machine,
    });
  } catch (error) {
    console.error('Failed to delete machine:', error);
    return NextResponse.json(
      {
        success: false,
        error: '機械の削除に失敗しました',
      },
      { status: 500 }
    );
  }
}

