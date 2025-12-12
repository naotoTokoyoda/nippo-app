import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { auth } from '@/lib/auth/auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// バリデーションスキーマ
const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['superAdmin', 'admin', 'manager', 'member']).optional(),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(8).optional().or(z.literal('')),
  pin: z.string().regex(/^\d{4}$/).optional(),
  isTrainee: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// GET: ユーザー取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
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

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'ユーザーが見つかりません',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.apiError('/api/admin/users/[id] [GET]', error instanceof Error ? error : new Error('Unknown error'));
    return NextResponse.json(
      {
        success: false,
        error: 'ユーザーの取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

// PUT: ユーザー更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = updateUserSchema.parse(body);

    // 現在のログインユーザーを取得
    const session = await auth();
    const currentUserId = session?.user?.id;
    const currentUserRole = session?.user?.role;

    // 既存ユーザーを取得
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'ユーザーが見つかりません',
        },
        { status: 404 }
      );
    }

    // === 権限変更の制限 ===
    if (validated.role && validated.role !== existingUser.role) {
      // 1. 自分の権限は変更できない
      if (id === currentUserId) {
        return NextResponse.json(
          {
            success: false,
            error: '自分の権限は変更できません',
          },
          { status: 403 }
        );
      }

      // 2. SuperAdminの権限は誰も変更できない
      if (existingUser.role === 'superAdmin') {
        return NextResponse.json(
          {
            success: false,
            error: 'SuperAdminの権限は変更できません',
          },
          { status: 403 }
        );
      }

      // 3. AdminはAdmin/SuperAdminの権限を変更できない
      if (currentUserRole === 'admin' && (existingUser.role === 'admin' || existingUser.role === 'superAdmin')) {
        return NextResponse.json(
          {
            success: false,
            error: '同等以上の権限を持つユーザーの権限は変更できません',
          },
          { status: 403 }
        );
      }
    }

    // === SuperAdminユーザーのisTrainee/isActive変更禁止 ===
    if (existingUser.role === 'superAdmin') {
      if (typeof validated.isTrainee === 'boolean' && validated.isTrainee !== existingUser.isTrainee) {
        return NextResponse.json(
          {
            success: false,
            error: 'SuperAdminの実習生フラグは変更できません',
          },
          { status: 403 }
        );
      }
      if (typeof validated.isActive === 'boolean' && validated.isActive !== existingUser.isActive) {
        return NextResponse.json(
          {
            success: false,
            error: 'SuperAdminのアクティブ状態は変更できません',
          },
          { status: 403 }
        );
      }
    }

    // === 自己無効化の禁止 ===
    if (id === currentUserId && typeof validated.isActive === 'boolean' && !validated.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: '自分自身を無効化することはできません',
        },
        { status: 403 }
      );
    }

    // 更新データの準備
    const updateData: {
      name?: string;
      role?: string;
      email?: string | null;
      password?: string | null;
      pin?: string;
      isTrainee?: boolean;
      isActive?: boolean;
    } = {};

    if (validated.name) updateData.name = validated.name;
    if (validated.role) updateData.role = validated.role;
    if (validated.pin) updateData.pin = validated.pin;
    // SuperAdminの場合はisTrainee/isActiveを更新しない
    if (existingUser.role !== 'superAdmin') {
      if (typeof validated.isTrainee === 'boolean') updateData.isTrainee = validated.isTrainee;
      if (typeof validated.isActive === 'boolean') updateData.isActive = validated.isActive;
    }

    // emailとpasswordの処理
    if (validated.email !== undefined) {
      updateData.email = validated.email || null;
    }
    if (validated.password && validated.password.length > 0) {
      updateData.password = await bcrypt.hash(validated.password, 10);
    }

    // ユーザー更新
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
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

    logger.info(`User updated: ${user.name} (${user.role})`);

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

    logger.apiError('/api/admin/users/[id] [PUT]', error instanceof Error ? error : new Error('Unknown error'));
    return NextResponse.json(
      {
        success: false,
        error: 'ユーザーの更新に失敗しました',
      },
      { status: 500 }
    );
  }
}

// DELETE: ユーザー論理削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 現在のログインユーザーを取得
    const session = await auth();
    const currentUserId = session?.user?.id;

    // 自分自身の無効化を禁止
    if (id === currentUserId) {
      return NextResponse.json(
        {
          success: false,
          error: '自分自身を無効化することはできません',
        },
        { status: 403 }
      );
    }

    // 対象ユーザーを取得
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });

    // SuperAdminの無効化を禁止
    if (targetUser?.role === 'superAdmin') {
      return NextResponse.json(
        {
          success: false,
          error: 'SuperAdminを無効化することはできません',
        },
        { status: 403 }
      );
    }

    // ユーザーを論理削除（isActiveをfalseに）
    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        name: true,
        role: true,
      },
    });

    logger.info(`User deactivated: ${user.name} (${user.role})`);

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.apiError('/api/admin/users/[id] [DELETE]', error instanceof Error ? error : new Error('Unknown error'));
    return NextResponse.json(
      {
        success: false,
        error: 'ユーザーの削除に失敗しました',
      },
      { status: 500 }
    );
  }
}

