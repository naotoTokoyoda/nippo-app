import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// バリデーションスキーマ
const createUserSchema = z.object({
  name: z.string().min(1, 'ユーザー名は必須です').max(100),
  role: z.enum(['admin', 'manager', 'member']),
  email: z.string().email('有効なメールアドレスを入力してください').optional().or(z.literal('')),
  password: z.string().min(8, 'パスワードは8文字以上必要です').optional().or(z.literal('')),
  pin: z.string().regex(/^\d{4}$/, 'PINは4桁の数字である必要があります'),
  isTrainee: z.boolean(),
  isActive: z.boolean(),
});

// GET: ユーザー一覧取得
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: [
        { isActive: 'desc' },
        { role: 'asc' },
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        role: true,
        email: true,
        pin: true,
        isTrainee: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error) {
    logger.apiError('/api/admin/users [GET]', error instanceof Error ? error : new Error('Unknown error'));
    return NextResponse.json(
      {
        success: false,
        error: 'ユーザー一覧の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

// POST: ユーザー作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createUserSchema.parse(body);

    // emailとpasswordの処理
    let hashedPassword: string | undefined;
    let email: string | undefined;

    if (validated.role === 'admin' || validated.role === 'manager') {
      // Admin/Managerはemailとpasswordが必要
      if (!validated.email || !validated.password) {
        return NextResponse.json(
          {
            success: false,
            error: 'Admin/Managerにはメールアドレスとパスワードが必要です',
          },
          { status: 400 }
        );
      }
      email = validated.email;
      hashedPassword = await bcrypt.hash(validated.password, 10);
    }

    // ユーザー作成
    const user = await prisma.user.create({
      data: {
        name: validated.name,
        role: validated.role,
        email: email || null,
        password: hashedPassword || null,
        pin: validated.pin,
        isTrainee: validated.isTrainee,
        isActive: validated.isActive,
      },
      select: {
        id: true,
        name: true,
        role: true,
        email: true,
        pin: true,
        isTrainee: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info(`User created: ${user.name} (${user.role})`);

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
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

    // Prismaのユニーク制約エラーをチェック
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        {
          success: false,
          error: 'このメールアドレスは既に使用されています',
        },
        { status: 400 }
      );
    }

    logger.apiError('/api/admin/users [POST]', error instanceof Error ? error : new Error('Unknown error'));
    return NextResponse.json(
      {
        success: false,
        error: 'ユーザーの作成に失敗しました',
      },
      { status: 500 }
    );
  }
}

