/**
 * PIN認証 API
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { userId, pin } = await request.json();

    if (!userId || !pin) {
      return NextResponse.json(
        { success: false, message: 'ユーザーIDとPINは必須です' },
        { status: 400 }
      );
    }

    // ユーザーを取得
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        pin: true,
        isActive: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: 'このユーザーは無効化されています' },
        { status: 403 }
      );
    }

    // PIN検証
    if (user.pin !== pin) {
      return NextResponse.json(
        { success: false, message: 'PINが正しくありません' },
        { status: 401 }
      );
    }

    // 認証成功
    return NextResponse.json({
      success: true,
      message: '認証成功',
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    logger.apiError('/api/auth/pin', error instanceof Error ? error : new Error('Unknown error'));
    return NextResponse.json(
      { success: false, message: '認証処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

