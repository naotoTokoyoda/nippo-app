import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// 機械作成用スキーマ
const createMachineSchema = z.object({
  name: z.string().min(1).max(100),
  memo: z.string().max(200).optional().nullable(),
});

// GET: 機械一覧取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const machines = await prisma.machine.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: machines,
    });
  } catch (error) {
    console.error('Failed to fetch machines:', error);
    return NextResponse.json(
      {
        success: false,
        error: '機械の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

// POST: 新規機械作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createMachineSchema.parse(body);

    // 同名の機械が存在するか確認
    const existing = await prisma.machine.findFirst({
      where: { name: validatedData.name },
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

    const machine = await prisma.machine.create({
      data: {
        name: validatedData.name,
        memo: validatedData.memo || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: machine,
    });
  } catch (error) {
    console.error('Failed to create machine:', error);
    
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
        error: '機械の作成に失敗しました',
      },
      { status: 500 }
    );
  }
}

